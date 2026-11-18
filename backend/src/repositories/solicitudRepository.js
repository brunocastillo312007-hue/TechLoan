
const pool = require("../config/database");
const auditoriaRepository = require("./auditoriaRepository");
const prestamoRepository = require("./prestamoRepository");

async function crearSolicitud(datos) {
  const {
    usuario_id,
    equipo_id,
    fecha_limite_solicitada,
    motivo_solicitud
  } = datos;

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    // Verificar que el solicitante esté activo
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

    // Verificar disponibilidad del equipo
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

    // Evitar solicitudes pendientes duplicadas
    const duplicado = await cliente.query(
      `SELECT id
       FROM solicitudes_prestamo
       WHERE usuario_id = $1
         AND equipo_id = $2
         AND estado = 'PENDIENTE'`,
      [usuario_id, equipo_id]
    );

    if (duplicado.rows.length > 0) {
      throw new Error("SOLICITUD_DUPLICADA");
    }

    // Registrar la solicitud
    const resultado = await cliente.query(
      `INSERT INTO solicitudes_prestamo (
         usuario_id,
         equipo_id,
         fecha_limite_solicitada,
         motivo_solicitud
       )
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        usuario_id,
        equipo_id,
        fecha_limite_solicitada,
        motivo_solicitud
      ]
    );

    await auditoriaRepository.registrarAuditoria(
  {
    usuario_id,
    accion: "CREAR",
    entidad: "SOLICITUD",
    entidad_id: resultado.rows[0].id,
    detalle: {
      equipo_id,
      fecha_limite_solicitada
    }
  },
  cliente
);

    await cliente.query("COMMIT");

    return resultado.rows[0];

  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}

async function obtenerMisSolicitudes(usuarioId) {
  const resultado = await pool.query(
    `SELECT
       s.id,
       s.equipo_id,
       e.codigo AS equipo_codigo,
       e.nombre AS equipo_nombre,
       s.fecha_solicitud,
       s.fecha_limite_solicitada,
       s.motivo_solicitud,
       s.estado,
       s.fecha_revision,
       s.motivo_rechazo,
       s.prestamo_id
     FROM solicitudes_prestamo s
     INNER JOIN equipos e
       ON s.equipo_id = e.id
     WHERE s.usuario_id = $1
     ORDER BY s.fecha_solicitud DESC, s.id DESC`,
    [usuarioId]
  );

  return resultado.rows;
}


async function cancelarSolicitud(id, usuarioId) {
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultado = await cliente.query(
      `SELECT id, usuario_id, equipo_id, estado
       FROM solicitudes_prestamo
       WHERE id = $1
         AND usuario_id = $2
       FOR UPDATE`,
      [id, usuarioId]
    );

    if (resultado.rows.length === 0) {
      throw new Error("SOLICITUD_NO_EXISTE");
    }

    const solicitud = resultado.rows[0];

    if (solicitud.estado !== "PENDIENTE") {
      throw new Error("SOLICITUD_NO_CANCELABLE");
    }

    const cancelacion = await cliente.query(
      `UPDATE solicitudes_prestamo
       SET estado = 'CANCELADA'
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await auditoriaRepository.registrarAuditoria(
      {
        usuario_id: usuarioId,
        accion: "CANCELAR",
        entidad: "SOLICITUD",
        entidad_id: id,
        detalle: {
          equipo_id: solicitud.equipo_id
        }
      },
      cliente
    );

    await cliente.query("COMMIT");

    return cancelacion.rows[0];

  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}


async function obtenerSolicitudesPendientes() {
  const resultado = await pool.query(
    `SELECT
       s.id,
       s.usuario_id,
       u.nombre AS usuario_nombre,
       u.tipo AS usuario_tipo,
       s.equipo_id,
       e.codigo AS equipo_codigo,
       e.nombre AS equipo_nombre,
       e.estado AS estado_equipo,
       s.fecha_solicitud,
       s.fecha_limite_solicitada,
       s.motivo_solicitud,
       s.estado
     FROM solicitudes_prestamo s
     INNER JOIN usuarios u ON u.id = s.usuario_id
     INNER JOIN equipos e ON e.id = s.equipo_id
     WHERE s.estado = 'PENDIENTE'
     ORDER BY s.fecha_solicitud ASC, s.id ASC`
  );

  return resultado.rows;
}


async function aprobarSolicitud(id, responsableId) {
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    // Bloquear la solicitud para evitar revisiones simultáneas
    const resultado = await cliente.query(
      `SELECT *
       FROM solicitudes_prestamo
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (resultado.rows.length === 0) {
      throw new Error("SOLICITUD_NO_EXISTE");
    }

    const solicitud = resultado.rows[0];

    if (solicitud.estado !== "PENDIENTE") {
      throw new Error("SOLICITUD_YA_PROCESADA");
    }

    if (
      new Date(solicitud.fecha_limite_solicitada).getTime()
      <= Date.now()
    ) {
      throw new Error("FECHA_LIMITE_VENCIDA");
    }

    // Crear préstamo usando la MISMA transacción
    const prestamo = await prestamoRepository.registrarPrestamo(
      {
        usuario_id: solicitud.usuario_id,
        equipo_id: solicitud.equipo_id,
        responsable_id: responsableId,
        fecha_limite: solicitud.fecha_limite_solicitada
      },
      cliente
    );

    // Asociar el préstamo a la solicitud
    const aprobacion = await cliente.query(
      `UPDATE solicitudes_prestamo
       SET estado = 'APROBADA',
           revisado_por = $1,
           fecha_revision = CURRENT_TIMESTAMP,
           prestamo_id = $2,
           motivo_rechazo = NULL
       WHERE id = $3
       RETURNING *`,
      [responsableId, prestamo.id, id]
    );

    // Registrar auditoría de aprobación
    await auditoriaRepository.registrarAuditoria(
      {
        usuario_id: responsableId,
        accion: "APROBAR",
        entidad: "SOLICITUD",
        entidad_id: id,
        detalle: {
          usuario_id: solicitud.usuario_id,
          equipo_id: solicitud.equipo_id,
          prestamo_id: prestamo.id
        }
      },
      cliente
    );

    await cliente.query("COMMIT");

    return {
      solicitud: aprobacion.rows[0],
      prestamo
    };

  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;

  } finally {
    cliente.release();
  }
}


async function rechazarSolicitud(id, responsableId, motivoRechazo) {
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultado = await cliente.query(
      `SELECT id, usuario_id, equipo_id, estado
       FROM solicitudes_prestamo
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (resultado.rows.length === 0) {
      throw new Error("SOLICITUD_NO_EXISTE");
    }

    const solicitud = resultado.rows[0];

    if (solicitud.estado !== "PENDIENTE") {
      throw new Error("SOLICITUD_YA_PROCESADA");
    }

    const rechazo = await cliente.query(
      `UPDATE solicitudes_prestamo
       SET estado = 'RECHAZADA',
           revisado_por = $1,
           fecha_revision = CURRENT_TIMESTAMP,
           motivo_rechazo = $2,
           prestamo_id = NULL
       WHERE id = $3
       RETURNING *`,
      [responsableId, motivoRechazo, id]
    );

    await auditoriaRepository.registrarAuditoria(
      {
        usuario_id: responsableId,
        accion: "RECHAZAR",
        entidad: "SOLICITUD",
        entidad_id: id,
        detalle: {
          usuario_id: solicitud.usuario_id,
          equipo_id: solicitud.equipo_id,
          motivo_rechazo: motivoRechazo
        }
      },
      cliente
    );

    await cliente.query("COMMIT");

    return rechazo.rows[0];

  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;

  } finally {
    cliente.release();
  }
}

module.exports = {
  crearSolicitud,
  obtenerMisSolicitudes,
  cancelarSolicitud,
  obtenerSolicitudesPendientes,
  aprobarSolicitud,
  rechazarSolicitud
};
