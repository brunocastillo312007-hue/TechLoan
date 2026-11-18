
const solicitudRepository = require(
  "../repositories/solicitudRepository"
);

async function crearSolicitud(req, res) {
  try {
    const {
      equipo_id,
      fecha_limite_solicitada,
      motivo_solicitud
    } = req.body;

    if (
      !Number.isSafeInteger(equipo_id) ||
      equipo_id <= 0
    ) {
      return res.status(400).json({
        mensaje: "ID de equipo inválido"
      });
    }

    if (
      typeof fecha_limite_solicitada !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(
        fecha_limite_solicitada
      ) ||
      !Number.isFinite(Date.parse(fecha_limite_solicitada)) ||
      new Date(fecha_limite_solicitada) <= new Date()
    ) {
      return res.status(400).json({
        mensaje: "Fecha límite solicitada inválida"
      });
    }

    if (
      motivo_solicitud !== undefined &&
      motivo_solicitud !== null &&
      typeof motivo_solicitud !== "string"
    ) {
      return res.status(400).json({
        mensaje: "El motivo debe ser un texto"
      });
    }

    const solicitud =
      await solicitudRepository.crearSolicitud({
        usuario_id: req.usuario.id,
        equipo_id,
        fecha_limite_solicitada,
        motivo_solicitud:
          typeof motivo_solicitud === "string"
            ? motivo_solicitud.trim()
            : null
      });

    return res.status(201).json({
      mensaje: "Solicitud registrada correctamente",
      solicitud
    });

  } catch (error) {
    const errores = {
      USUARIO_NO_EXISTE: [
        404,
        "El usuario no existe"
      ],
      USUARIO_NO_AUTORIZADO: [
        403,
        "No tienes permiso para solicitar equipos"
      ],
      EQUIPO_NO_EXISTE: [
        404,
        "El equipo no existe"
      ],
      EQUIPO_NO_DISPONIBLE: [
        409,
        "El equipo no está disponible"
      ],
      SOLICITUD_DUPLICADA: [
        409,
        "Ya tienes una solicitud pendiente para este equipo"
      ]
    };

    if (errores[error.message]) {
      const [estado, mensaje] = errores[error.message];

      return res.status(estado).json({ mensaje });
    }

    if (error.code === "23505") {
      return res.status(409).json({
        mensaje: "Ya existe una solicitud pendiente para este equipo"
      });
    }

    if (error.code === "23514") {
      return res.status(400).json({
        mensaje: "La fecha límite debe ser posterior a la solicitud"
      });
    }

    console.error(error);

    return res.status(500).json({
      mensaje: "Error al registrar la solicitud"
    });
  }
}

async function listarMisSolicitudes(req, res) {
  try {
    const solicitudes =
      await solicitudRepository.obtenerMisSolicitudes(
        req.usuario.id
      );

    return res.status(200).json({
      mensaje: "Solicitudes consultadas correctamente",
      total: solicitudes.length,
      solicitudes
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      mensaje: "Error al consultar tus solicitudes"
    });
  }
}


async function cancelarSolicitud(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        mensaje: "ID de solicitud inválido"
      });
    }

    const solicitud =
      await solicitudRepository.cancelarSolicitud(
        id,
        req.usuario.id
      );

    return res.status(200).json({
      mensaje: "Solicitud cancelada correctamente",
      solicitud
    });

  } catch (error) {
    if (error.message === "SOLICITUD_NO_EXISTE") {
      return res.status(404).json({
        mensaje: "Solicitud no encontrada"
      });
    }

    if (error.message === "SOLICITUD_NO_CANCELABLE") {
      return res.status(409).json({
        mensaje: "Solo puedes cancelar solicitudes pendientes"
      });
    }

    console.error(error);

    return res.status(500).json({
      mensaje: "Error al cancelar la solicitud"
    });
  }
}


async function listarPendientes(req, res) {
  try {
    const solicitudes =
      await solicitudRepository.obtenerSolicitudesPendientes();

    return res.status(200).json({
      mensaje: "Solicitudes pendientes consultadas correctamente",
      total: solicitudes.length,
      solicitudes
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      mensaje: "Error al consultar solicitudes pendientes"
    });
  }
}

async function aprobarSolicitud(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        mensaje: "ID de solicitud inválido"
      });
    }

    const resultado =
      await solicitudRepository.aprobarSolicitud(
        id,
        req.usuario.id
      );

    return res.status(200).json({
      mensaje: "Solicitud aprobada y préstamo creado correctamente",
      ...resultado
    });

  } catch (error) {
    const errores = {
      SOLICITUD_NO_EXISTE: [404, "La solicitud no existe"],
      SOLICITUD_YA_PROCESADA: [409, "La solicitud ya fue procesada"],
      FECHA_LIMITE_VENCIDA: [409, "La fecha límite solicitada ya venció"],
      USUARIO_NO_EXISTE: [404, "El solicitante no existe"],
      USUARIO_NO_AUTORIZADO: [403, "El solicitante no está autorizado o está inactivo"],
      EQUIPO_NO_EXISTE: [404, "El equipo no existe"],
      EQUIPO_NO_DISPONIBLE: [409, "El equipo no está disponible"],
      PRESTAMO_DUPLICADO: [409, "El equipo ya tiene un préstamo activo"]
    };

    if (errores[error.message]) {
      const [estado, mensaje] = errores[error.message];
      return res.status(estado).json({ mensaje });
    }

    console.error(error);
    return res.status(500).json({
      mensaje: "Error al aprobar la solicitud"
    });
  }
}

async function rechazarSolicitud(req, res) {
  try {
    const id = Number(req.params.id);
    const { motivo_rechazo } = req.body || {};

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        mensaje: "ID de solicitud inválido"
      });
    }

    if (
      typeof motivo_rechazo !== "string" ||
      !motivo_rechazo.trim()
    ) {
      return res.status(400).json({
        mensaje: "Debes indicar un motivo de rechazo"
      });
    }

    const solicitud =
      await solicitudRepository.rechazarSolicitud(
        id,
        req.usuario.id,
        motivo_rechazo.trim()
      );

    return res.status(200).json({
      mensaje: "Solicitud rechazada correctamente",
      solicitud
    });

  } catch (error) {
    if (error.message === "SOLICITUD_NO_EXISTE") {
      return res.status(404).json({
        mensaje: "La solicitud no existe"
      });
    }

    if (error.message === "SOLICITUD_YA_PROCESADA") {
      return res.status(409).json({
        mensaje: "La solicitud ya fue procesada"
      });
    }

    console.error(error);
    return res.status(500).json({
      mensaje: "Error al rechazar la solicitud"
    });
  }
}

module.exports = {
  crearSolicitud,
  listarMisSolicitudes,
  cancelarSolicitud,
  listarPendientes,
  aprobarSolicitud,
  rechazarSolicitud
};
