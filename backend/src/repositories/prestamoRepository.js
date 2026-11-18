
const pool = require("../config/database");
const auditoriaRepository = require("./auditoriaRepository");


async function registrarPrestamo(datos, clienteExterno = null) {
  const {
    usuario_id,
    equipo_id,
    responsable_id,
    fecha_limite
  } = datos;

  const cliente = clienteExterno || await pool.connect();
  const transaccionPropia = !clienteExterno;

  try {
    if (transaccionPropia) {
      await cliente.query("BEGIN");
    }

    // 1. Verificar que el usuario exista y esté activo
    const resultadoUsuario = await cliente.query(
      `SELECT id, rol, tipo, activo
       FROM usuarios
       WHERE id = $1
       FOR UPDATE`,
      [usuario_id]
    );

    if (resultadoUsuario.rows.length === 0) {
      throw new Error("USUARIO_NO_EXISTE");
    }

    const usuario = resultadoUsuario.rows[0];

    if (
      !usuario.activo ||
      usuario.rol !== "USUARIO" ||
      !["ESTUDIANTE", "DOCENTE"].includes(usuario.tipo)
    ) {
      throw new Error("USUARIO_NO_AUTORIZADO");
    }

    // 2. Bloquear el equipo
    const resultadoEquipo = await cliente.query(
      `SELECT id, estado
       FROM equipos
       WHERE id = $1
       FOR UPDATE`,
      [equipo_id]
    );

    if (resultadoEquipo.rows.length === 0) {
      throw new Error("EQUIPO_NO_EXISTE");
    }

    if (resultadoEquipo.rows[0].estado !== "DISPONIBLE") {
      throw new Error("EQUIPO_NO_DISPONIBLE");
    }

    // 3. Verificar que no exista otro préstamo activo
    const prestamoActivo = await cliente.query(
      `SELECT id
       FROM prestamos
       WHERE equipo_id = $1
         AND estado = 'ACTIVO'`,
      [equipo_id]
    );

    if (prestamoActivo.rows.length > 0) {
      throw new Error("PRESTAMO_DUPLICADO");
    }

    // 4. Crear el préstamo
    const resultado = await cliente.query(
      `INSERT INTO prestamos
       (usuario_id, equipo_id, responsable_id, fecha_limite)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        usuario_id,
        equipo_id,
        responsable_id,
        fecha_limite
      ]
    );

    // 5. Cambiar el estado del equipo
    await cliente.query(
      `UPDATE equipos
       SET estado = 'PRESTADO'
       WHERE id = $1`,
      [equipo_id]
    );

    // 6. Registrar la auditoría
    await auditoriaRepository.registrarAuditoria(
      {
        usuario_id: responsable_id,
        accion: "CREAR",
        entidad: "PRESTAMO",
        entidad_id: resultado.rows[0].id,
        detalle: {
          usuario_id,
          equipo_id,
          fecha_limite
        }
      },
      cliente
    );

    // 7. Confirmar solo si la transacción es propia
    if (transaccionPropia) {
      await cliente.query("COMMIT");
    }

    return resultado.rows[0];

  } catch (error) {
    if (transaccionPropia) {
      await cliente.query("ROLLBACK");
    }

    throw error;

  } finally {
    if (transaccionPropia) {
      cliente.release();
    }
  }
}


async function obtenerPrestamos() {
  const resultado = await pool.query(
    `SELECT
       p.*,
       u.nombre AS usuario_nombre,
       e.nombre AS equipo_nombre,
       e.codigo AS equipo_codigo,
       r.nombre AS responsable_nombre
     FROM prestamos p
     JOIN usuarios u ON p.usuario_id = u.id
     JOIN equipos e ON p.equipo_id = e.id
     JOIN usuarios r ON p.responsable_id = r.id
     ORDER BY p.id DESC`
  );

  return resultado.rows;
}


async function registrarDevolucion(id, datos) {
  const { danado, descripcion, responsable_id } = datos;
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    // Bloquear el préstamo para evitar dos devoluciones
    const resultado = await cliente.query(
      `SELECT * FROM prestamos
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (resultado.rows.length === 0) {
      throw new Error("PRESTAMO_NO_EXISTE");
    }

    const prestamo = resultado.rows[0];

    if (prestamo.estado !== "ACTIVO") {
      throw new Error("PRESTAMO_YA_DEVUELTO");
    }

    // Registrar la devolución
    const devolucion = await cliente.query(
      `UPDATE prestamos
       SET estado = 'DEVUELTO',
           fecha_devolucion = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    // Determinar el estado del equipo
    const nuevoEstado = danado
      ? "MANTENIMIENTO"
      : "DISPONIBLE";

    await cliente.query(
      `UPDATE equipos
       SET estado = $1
       WHERE id = $2`,
      [nuevoEstado, prestamo.equipo_id]
    );

    let incidencia = null;

    // Si existe daño, registrar obligatoriamente la incidencia
    if (danado) {
      const resultadoIncidencia = await cliente.query(
        `INSERT INTO incidencias
         (prestamo_id, equipo_id, responsable_id, descripcion)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          id,
          prestamo.equipo_id,
          responsable_id,
          descripcion.trim()
        ]
      );

      incidencia = resultadoIncidencia.rows[0];
    }
    

await auditoriaRepository.registrarAuditoria(
  {
    usuario_id: responsable_id,
    accion: "DEVOLVER",
    entidad: "PRESTAMO",
    entidad_id: Number(id),
    detalle: {
      equipo_id: prestamo.equipo_id,
      danado,
      estado_equipo: nuevoEstado,
      incidencia_id: incidencia ? incidencia.id : null
    }
  },
  cliente
);

    await cliente.query("COMMIT");

    return {
      prestamo: devolucion.rows[0],
      estado_equipo: nuevoEstado,
      incidencia
    };

  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}


async function obtenerPrestamosVencidos() {
  const resultado = await pool.query(
    `SELECT
       p.id,
       p.fecha_prestamo,
       p.fecha_limite,
       p.estado,
       u.nombre AS usuario_nombre,
       u.correo AS usuario_correo,
       e.nombre AS equipo_nombre,
       e.codigo AS equipo_codigo,
       r.nombre AS responsable_nombre,
       CURRENT_DATE - p.fecha_limite::date
         AS dias_atraso
     FROM prestamos p
     JOIN usuarios u ON p.usuario_id = u.id
     JOIN equipos e ON p.equipo_id = e.id
     JOIN usuarios r ON p.responsable_id = r.id
     WHERE p.estado = 'ACTIVO'
       AND p.fecha_limite < CURRENT_TIMESTAMP
     ORDER BY p.fecha_limite ASC`
  );

  return resultado.rows;
}


async function obtenerAlertasDevolucion() {
  const resultado = await pool.query(
    `SELECT
       p.id AS prestamo_id,
       p.fecha_prestamo,
       p.fecha_limite,
       u.nombre AS usuario_nombre,
       u.correo AS usuario_correo,
       e.id AS equipo_id,
       e.codigo AS equipo_codigo,
       e.nombre AS equipo_nombre,
       r.nombre AS responsable_nombre,
       CASE
         WHEN p.fecha_limite < CURRENT_TIMESTAMP
           THEN 'VENCIDO'
         ELSE 'PROXIMO_A_VENCER'
       END AS tipo_alerta,
       GREATEST(
         0,
         CEIL(
           EXTRACT(EPOCH FROM
             (p.fecha_limite - CURRENT_TIMESTAMP)
           ) / 3600
         )
       )::integer AS horas_restantes
     FROM prestamos p
     JOIN usuarios u
       ON p.usuario_id = u.id
     JOIN equipos e
       ON p.equipo_id = e.id
     JOIN usuarios r
       ON p.responsable_id = r.id
     WHERE p.estado = 'ACTIVO'
       AND p.fecha_limite <=
         CURRENT_TIMESTAMP + INTERVAL '48 hours'
     ORDER BY p.fecha_limite ASC`
  );

  return resultado.rows;
}


async function obtenerMisPrestamos(usuarioId) {
  const resultado = await pool.query(
    `SELECT
       p.id,
       p.equipo_id,
       e.codigo AS equipo_codigo,
       e.nombre AS equipo_nombre,
       e.marca AS equipo_marca,
       e.modelo AS equipo_modelo,
       p.fecha_prestamo,
       p.fecha_limite,
       p.fecha_devolucion,
       p.estado,
       CASE
         WHEN p.estado = 'ACTIVO'
          AND p.fecha_limite < CURRENT_TIMESTAMP
         THEN TRUE
         ELSE FALSE
       END AS vencido
     FROM prestamos p
     INNER JOIN equipos e
       ON p.equipo_id = e.id
     WHERE p.usuario_id = $1
     ORDER BY p.fecha_prestamo DESC, p.id DESC`,
    [usuarioId]
  );

  return resultado.rows;
}

module.exports = {
  registrarPrestamo,
  obtenerPrestamos,
  registrarDevolucion,
  obtenerPrestamosVencidos,
  obtenerAlertasDevolucion,
  obtenerMisPrestamos
};
