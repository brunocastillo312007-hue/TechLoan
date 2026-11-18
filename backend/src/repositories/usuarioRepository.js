
const pool = require("../config/database");
const auditoriaRepository = require("./auditoriaRepository");

async function buscarPorCorreo(correo) {
  const resultado = await pool.query(
    "SELECT * FROM usuarios WHERE correo = $1",
    [correo]
  );

  return resultado.rows[0];
}


async function crearUsuario(usuario, administradorId) {
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const {
      nombre,
      correo,
      password_hash,
      rol,
      tipo
    } = usuario;

    
const resultado = await cliente.query(
  `INSERT INTO usuarios (
     nombre,
     correo,
     password_hash,
     rol,
     tipo,
     activo,
     correo_verificado,
     estado_cuenta,
     fecha_verificacion,
     fecha_aprobacion,
     aprobado_por
   )
   VALUES (
     $1,
     $2,
     $3,
     $4,
     $5,
     TRUE,
     TRUE,
     'ACTIVO',
     CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP,
     $6::integer
   )
   RETURNING
     id,
     nombre,
     correo,
     rol,
     tipo,
     activo,
     correo_verificado,
     estado_cuenta,
     fecha_registro`,
  [
    nombre,
    correo,
    password_hash,
    rol,
    tipo,
    administradorId
  ]
);


    const nuevoUsuario = resultado.rows[0];

    await auditoriaRepository.registrarAuditoria(
      {
        usuario_id: administradorId,
        accion: "CREAR",
        entidad: "USUARIO",
        entidad_id: nuevoUsuario.id,
        detalle: {
          nombre: nuevoUsuario.nombre,
          correo: nuevoUsuario.correo,
          rol: nuevoUsuario.rol,
          tipo: nuevoUsuario.tipo
        }
      },
      cliente
    );

    await cliente.query("COMMIT");

    return nuevoUsuario;

  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}




async function obtenerUsuarios() {
  const resultado = await pool.query(
    `SELECT
       id,
       nombre,
       correo,
       rol,
       tipo,
       activo,
       correo_verificado,
       estado_cuenta,
       fecha_registro
     FROM usuarios
     ORDER BY id DESC`
  );

  return resultado.rows;
}


async function obtenerUsuarioPorId(id) {
  const resultado = await pool.query(
    `SELECT id, nombre, correo, rol, tipo,
            activo, fecha_registro
     FROM usuarios
     WHERE id = $1`,
    [id]
  );

  return resultado.rows[0];
}




async function cambiarEstadoUsuario(
  id,
  activo,
  administradorId
) {
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    // Obtener y bloquear el usuario
    const anterior = await cliente.query(
      `SELECT
         id,
         nombre,
         correo,
         activo,
         estado_cuenta,
         version_sesion
       FROM usuarios
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (anterior.rows.length === 0) {
      await cliente.query("ROLLBACK");
      return null;
    }

    const usuarioAnterior = anterior.rows[0];

    // Impedir activar cuentas no aprobadas
    if (
      activo === true &&
      !["ACTIVO", "INACTIVO"].includes(
        usuarioAnterior.estado_cuenta
      )
    ) {
      await cliente.query("ROLLBACK");

      return {
        error: "CUENTA_NO_APROBADA"
      };
    }

    // Actualizar estado y revocar sesiones al desactivar
    const resultado = await cliente.query(
      `UPDATE usuarios
       SET
         activo = $1,
         version_sesion = CASE
           WHEN activo = TRUE AND $1::boolean = FALSE
           THEN version_sesion + 1
           ELSE version_sesion
         END
       WHERE id = $2
       RETURNING
         id,
         nombre,
         correo,
         rol,
         tipo,
         activo,
         estado_cuenta,
         version_sesion,
         fecha_registro`,
      [activo, id]
    );

    const usuarioActualizado = resultado.rows[0];

    // Registrar auditoría si cambió el estado
    if (usuarioAnterior.activo !== activo) {
      await auditoriaRepository.registrarAuditoria(
        {
          usuario_id: administradorId,
          accion: activo ? "ACTIVAR" : "DESACTIVAR",
          entidad: "USUARIO",
          entidad_id: Number(id),
          detalle: {
            nombre: usuarioActualizado.nombre,
            estado_anterior: usuarioAnterior.activo,
            estado_nuevo: activo,
            version_sesion_anterior:
              usuarioAnterior.version_sesion,
            version_sesion_nueva:
              usuarioActualizado.version_sesion
          }
        },
        cliente
      );
    }

    await cliente.query("COMMIT");

    return usuarioActualizado;

  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;

  } finally {
    cliente.release();
  }
}




async function obtenerSolicitantesActivos() {
  const resultado = await pool.query(
    `SELECT id, nombre, tipo
     FROM usuarios
     WHERE activo = TRUE
     ORDER BY nombre ASC`
  );

  return resultado.rows;
}


/* ==========================================
   REGISTRO PÚBLICO DE USUARIOS
   ========================================== */

async function crearUsuarioPublico(usuario) {

  const {
    nombre,
    correo,
    password_hash,
    tipo
  } = usuario;

  const resultado = await pool.query(
    `INSERT INTO usuarios (
       nombre,
       correo,
       password_hash,
       rol,
       tipo,
       activo,
       correo_verificado,
       estado_cuenta
     )
     VALUES (
       $1, $2, $3,
       'USUARIO',
       $4,
       FALSE,
       FALSE,
       'PENDIENTE_VERIFICACION'
     )
     RETURNING
       id,
       nombre,
       correo,
       rol,
       tipo,
       activo,
       correo_verificado,
       estado_cuenta`,
    [
      nombre,
      correo,
      password_hash,
      tipo
    ]
  );

  return resultado.rows[0];
}


/* ==========================================
   GUARDAR CÓDIGO DE VERIFICACIÓN
   ========================================== */

async function guardarCodigoVerificacion(
  usuarioId,
  codigoHash
) {

  const resultado = await pool.query(
    `INSERT INTO verificaciones_correo (
       usuario_id,
       codigo_hash,
       fecha_expiracion
     )
     VALUES (
       $1,
       $2,
       CURRENT_TIMESTAMP + INTERVAL '10 minutes'
     )
     RETURNING id, usuario_id, fecha_expiracion`,
    [usuarioId, codigoHash]
  );

  return resultado.rows[0];
}


/* ==========================================
   VERIFICAR CÓDIGO DE CORREO
   ========================================== */

async function verificarCodigoCorreo(correo, codigoHash) {

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    // Buscar usuario y bloquear su registro
    const resultadoUsuario = await cliente.query(
      `SELECT id, correo_verificado, estado_cuenta
       FROM usuarios
       WHERE correo = $1
       FOR UPDATE`,
      [correo]
    );

    const usuario = resultadoUsuario.rows[0];

    if (!usuario) {
      await cliente.query("ROLLBACK");
      return { estado: "INVALIDO" };
    }

    if (usuario.correo_verificado) {
      await cliente.query("ROLLBACK");
      return { estado: "YA_VERIFICADO" };
    }

    if (usuario.estado_cuenta !== "PENDIENTE_VERIFICACION") {
      await cliente.query("ROLLBACK");
      return { estado: "INVALIDO" };
    }

    // Buscar el último código emitido
    const resultadoCodigo = await cliente.query(
      `SELECT *
       FROM verificaciones_correo
       WHERE usuario_id = $1
         AND utilizado = FALSE
       ORDER BY fecha_creacion DESC, id DESC
       LIMIT 1
       FOR UPDATE`,
      [usuario.id]
    );

    const verificacion = resultadoCodigo.rows[0];

    if (!verificacion) {
      await cliente.query("ROLLBACK");
      return { estado: "INVALIDO" };
    }

    if (verificacion.intentos >= 5) {
      await cliente.query("ROLLBACK");
      return { estado: "BLOQUEADO" };
    }

    if (new Date(verificacion.fecha_expiracion) <= new Date()) {
      await cliente.query("ROLLBACK");
      return { estado: "EXPIRADO" };
    }

    // Comprobar el hash del código
    if (verificacion.codigo_hash !== codigoHash) {

      await cliente.query(
        `UPDATE verificaciones_correo
         SET intentos = intentos + 1
         WHERE id = $1`,
        [verificacion.id]
      );

      await cliente.query("COMMIT");

      return { estado: "INVALIDO" };
    }

    // Marcar código como utilizado
    await cliente.query(
      `UPDATE verificaciones_correo
       SET utilizado = TRUE
       WHERE usuario_id = $1`,
      [usuario.id]
    );

    // Marcar correo verificado
    await cliente.query(
      `UPDATE usuarios
       SET correo_verificado = TRUE,
           estado_cuenta = 'PENDIENTE_APROBACION',
           fecha_verificacion = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [usuario.id]
    );

    await cliente.query("COMMIT");

    return { estado: "VERIFICADO" };

  } catch (error) {

    await cliente.query("ROLLBACK");
    throw error;

  } finally {

    cliente.release();

  }
}


/* ==========================================
   USUARIOS PENDIENTES DE APROBACIÓN
   ========================================== */

async function obtenerUsuariosPendientes() {

  const resultado = await pool.query(
    `SELECT
       id,
       nombre,
       correo,
       rol,
       tipo,
       fecha_registro,
       fecha_verificacion,
       estado_cuenta
     FROM usuarios
     WHERE estado_cuenta = 'PENDIENTE_APROBACION'
       AND correo_verificado = TRUE
       AND activo = FALSE
     ORDER BY fecha_verificacion ASC`
  );

  return resultado.rows;

}


/* ==========================================
   APROBAR O RECHAZAR CUENTAS
   ========================================== */

async function resolverSolicitudCuenta(
  usuarioId,
  administradorId,
  decision
) {

  if (!["APROBAR", "RECHAZAR"].includes(decision)) {
    throw new Error("Decisión no válida");
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultado = await cliente.query(
      `SELECT id, nombre, correo, rol, tipo,
              estado_cuenta, correo_verificado, activo
       FROM usuarios
       WHERE id = $1
       FOR UPDATE`,
      [usuarioId]
    );

    const usuario = resultado.rows[0];

    if (!usuario) {
      await cliente.query("ROLLBACK");
      return { estado: "NO_ENCONTRADO" };
    }

    if (
      usuario.estado_cuenta !== "PENDIENTE_APROBACION" ||
      usuario.correo_verificado !== true ||
      usuario.activo !== false ||
      usuario.rol !== "USUARIO"
    ) {
      await cliente.query("ROLLBACK");
      return { estado: "NO_PENDIENTE" };
    }

    const aprobado = decision === "APROBAR";

    
const actualizado = await cliente.query(
  `UPDATE usuarios
   SET estado_cuenta = $1,
       activo = $2,
       fecha_aprobacion =
         CASE
           WHEN $2::boolean
           THEN CURRENT_TIMESTAMP
           ELSE NULL
         END,
       aprobado_por =
         CASE
           WHEN $2::boolean
           THEN $3::integer
           ELSE NULL
         END
   WHERE id = $4
   RETURNING
     id,
     nombre,
     correo,
     rol,
     tipo,
     activo,
     correo_verificado,
     estado_cuenta`,
  [
    aprobado ? "ACTIVO" : "RECHAZADO",
    aprobado,
    administradorId,
    usuarioId
  ]
);


    await auditoriaRepository.registrarAuditoria(
      {
        usuario_id: administradorId,
        accion: aprobado ? "APROBAR" : "RECHAZAR",
        entidad: "USUARIO",
        entidad_id: Number(usuarioId),
        detalle: {
          nombre: usuario.nombre,
          correo: usuario.correo,
          estado_anterior: usuario.estado_cuenta,
          estado_nuevo: aprobado ? "ACTIVO" : "RECHAZADO"
        }
      },
      cliente
    );

    await cliente.query("COMMIT");

    return {
      estado: aprobado ? "APROBADO" : "RECHAZADO",
      usuario: actualizado.rows[0]
    };

  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}

module.exports = {
  buscarPorCorreo,
  crearUsuario,
  crearUsuarioPublico,
  obtenerUsuarios,
  obtenerUsuarioPorId,
  cambiarEstadoUsuario,
  obtenerSolicitantesActivos,
  guardarCodigoVerificacion,
  verificarCodigoCorreo,
  obtenerUsuariosPendientes,
  resolverSolicitudCuenta
};

