
const prestamoRepository = require(
  "../repositories/prestamoRepository"
);

async function listarPrestamos(req, res) {
  try {
    const prestamos =
      await prestamoRepository.obtenerPrestamos();

    res.json(prestamos);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al consultar préstamos"
    });
  }
}

async function crearPrestamo(req, res) {
  try {
    const {
      usuario_id,
      equipo_id,
      fecha_limite
    } = req.body;

    if (
      !Number.isSafeInteger(usuario_id) || usuario_id <= 0 ||
      !Number.isSafeInteger(equipo_id) || equipo_id <= 0 ||
      typeof fecha_limite !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(fecha_limite) ||
      !Number.isFinite(Date.parse(fecha_limite)) ||
      new Date(fecha_limite) <= new Date()
    ) {
      return res.status(400).json({
        mensaje: "Datos inválidos o fecha límite incorrecta"
      });
    }

    const prestamo =
      await prestamoRepository.registrarPrestamo({
        usuario_id,
        equipo_id,
        responsable_id: req.usuario.id,
        fecha_limite
      });

    res.status(201).json({
      mensaje: "Préstamo registrado correctamente",
      prestamo
    });

  } catch (error) {
    if (error.message === "EQUIPO_NO_EXISTE") {
      return res.status(404).json({
        mensaje: "El equipo no existe"
      });
    }

    if (
      error.message === "EQUIPO_NO_DISPONIBLE" ||
      error.message === "PRESTAMO_DUPLICADO" ||
      error.code === "23505"
    ) {
      return res.status(409).json({
        mensaje: "El equipo no está disponible para préstamo"
      });
    }

    if (error.code === "23503") {
      return res.status(400).json({
        mensaje: "El usuario o responsable no existe"
      });
    }

    if (error.code === "23514") {
      return res.status(400).json({
        mensaje: "La fecha límite debe ser posterior al préstamo"
      });
    }

    console.error(error);

    res.status(500).json({
      mensaje: "Error al registrar préstamo"
    });
  }
}


async function devolverEquipo(req, res) {
  try {
    const id = Number(req.params.id);
    const { danado, descripcion } = req.body;

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        mensaje: "ID de préstamo inválido"
      });
    }

    if (typeof danado !== "boolean") {
      return res.status(400).json({
        mensaje: "Debes indicar si el equipo está dañado"
      });
    }

    if (
      danado &&
      (typeof descripcion !== "string" ||
       !descripcion.trim())
    ) {
      return res.status(400).json({
        mensaje: "Debes describir el daño del equipo"
      });
    }

    const resultado =
      await prestamoRepository.registrarDevolucion(
        id,
        {
          danado,
          descripcion,
          responsable_id: req.usuario.id
        }
      );

    res.json({
      mensaje: "Devolución registrada correctamente",
      ...resultado
    });

  } catch (error) {
    if (error.message === "PRESTAMO_NO_EXISTE") {
      return res.status(404).json({
        mensaje: "Préstamo no encontrado"
      });
    }

    if (error.message === "PRESTAMO_YA_DEVUELTO") {
      return res.status(409).json({
        mensaje: "Este préstamo ya fue devuelto"
      });
    }

    console.error(error);

    res.status(500).json({
      mensaje: "Error al registrar la devolución"
    });
  }
}


async function listarPrestamosVencidos(req, res) {
  try {
    const prestamos =
      await prestamoRepository.obtenerPrestamosVencidos();

    res.json({
      mensaje: "Reporte de préstamos vencidos",
      total: prestamos.length,
      prestamos
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al generar reporte de vencidos"
    });
  }
}


async function listarAlertasDevolucion(req, res) {
  try {
    const alertas =
      await prestamoRepository.obtenerAlertasDevolucion();

    const vencidos = alertas.filter(
      alerta => alerta.tipo_alerta === "VENCIDO"
    );

    const proximos = alertas.filter(
      alerta => alerta.tipo_alerta === "PROXIMO_A_VENCER"
    );

    res.json({
      mensaje: "Alertas de devolución de equipos",
      resumen: {
        total_alertas: alertas.length,
        vencidos: vencidos.length,
        proximos_a_vencer: proximos.length
      },
      alertas
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al consultar alertas"
    });
  }
}


async function listarMisPrestamos(req, res) {
  try {
    const usuarioId = req.usuario.id;

    const prestamos =
      await prestamoRepository.obtenerMisPrestamos(usuarioId);

    return res.status(200).json({
      mensaje: "Mis préstamos consultados correctamente",
      total: prestamos.length,
      prestamos
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      mensaje: "Error al consultar tus préstamos"
    });
  }
}

module.exports = {
  listarPrestamos,
  crearPrestamo,
  devolverEquipo,
  listarPrestamosVencidos,
  listarAlertasDevolucion,
  listarMisPrestamos
};
