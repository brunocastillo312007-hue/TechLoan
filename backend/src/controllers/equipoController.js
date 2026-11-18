
const equipoRepository = require("../repositories/equipoRepository");


async function listarEquipos(req, res) {
  try {
    const {
      buscar = "",
      estado = "",
      marca = "",
      ordenar = "id",
      direccion = "DESC",
      pagina = "1",
      limite = "10"
    } = req.query;

    const estadosPermitidos = [
      "DISPONIBLE",
      "PRESTADO",
      "MANTENIMIENTO",
      "INACTIVO"
    ];

    const columnasPermitidas = [
      "id", "codigo", "nombre",
      "marca", "estado", "fecha_registro"
    ];

    const numeroPagina = Number(pagina);
    const numeroLimite = Number(limite);

    if (
      typeof buscar !== "string" ||
      typeof marca !== "string" ||
      typeof estado !== "string" ||
      !Number.isSafeInteger(numeroPagina) ||
      numeroPagina < 1 ||
      !Number.isSafeInteger(numeroLimite) ||
      numeroLimite < 1 ||
      numeroLimite > 100 ||
      (estado && !estadosPermitidos.includes(estado)) ||
      !columnasPermitidas.includes(ordenar) ||
      !["ASC", "DESC"].includes(direccion)
    ) {
      return res.status(400).json({
        mensaje: "Parámetros de búsqueda inválidos"
      });
    }

    const resultado = await equipoRepository.obtenerEquipos({
      buscar: buscar.trim(),
      estado,
      marca: marca.trim(),
      ordenar,
      direccion,
      pagina: numeroPagina,
      limite: numeroLimite
    });

    res.json(resultado);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al consultar equipos"
    });
  }
}


async function buscarEquipo(req, res) {
  try {
    const equipo = await equipoRepository.obtenerEquipoPorId(req.params.id);

    if (!equipo) {
      return res.status(404).json({
        mensaje: "Equipo no encontrado"
      });
    }

    res.json(equipo);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      mensaje: "Error al buscar el equipo"
    });
  }
}


async function registrarEquipo(req, res) {
  try {
    const { codigo, nombre } = req.body;

    if (
      typeof codigo !== "string" || !codigo.trim() ||
      typeof nombre !== "string" || !nombre.trim()
    ) {
      return res.status(400).json({
        mensaje: "El código y el nombre son obligatorios"
      });
    }

    // Crear el equipo y registrar su auditoría
    const nuevoEquipo = await equipoRepository.crearEquipo(
      req.body,
      req.usuario.id
    );

    return res.status(201).json({
      mensaje: "Equipo registrado correctamente",
      equipo: nuevoEquipo
    });

  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        mensaje: "Ya existe un equipo con ese código o número de serie"
      });
    }

    console.error(error);

    return res.status(500).json({
      mensaje: "Error al registrar el equipo"
    });
  }
}



async function editarEquipo(req, res) {
  try {
    const { codigo, nombre } = req.body;

    if (typeof codigo !== "string" || !codigo.trim() ||
        typeof nombre !== "string" || !nombre.trim()) {
      return res.status(400).json({
        mensaje: "El código y nombre son obligatorios"
      });
    }

    const equipo = await equipoRepository.actualizarEquipo(
      req.params.id,
      req.body, 
      req.usuario.id  
    );

    if (!equipo) {
      return res.status(404).json({
        mensaje: "Equipo no encontrado"
      });
    }

    res.json({
      mensaje: "Equipo actualizado correctamente",
      equipo
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        mensaje: "Código o número de serie duplicado"
      });
    }

    console.error(error);
    res.status(500).json({
      mensaje: "Error al actualizar el equipo"
    });
  }
}

async function borrarEquipo(req, res) {
  try {
    const equipo = await equipoRepository.eliminarEquipo(
      req.params.id,
      req.usuario.id
    );

    if (!equipo) {
      return res.status(404).json({
        mensaje: "Equipo no encontrado"
      });
    }

    res.json({
      mensaje: "Equipo eliminado correctamente"
    });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(409).json({
        mensaje: "No se puede eliminar un equipo con préstamos registrados"
      });
    }

    console.error(error);
    res.status(500).json({
      mensaje: "Error al eliminar el equipo"
    });
  }
}


async function historialEquipo(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        mensaje: "ID de equipo inválido"
      });
    }

    const equipo =
      await equipoRepository.obtenerEquipoPorId(id);

    if (!equipo) {
      return res.status(404).json({
        mensaje: "Equipo no encontrado"
      });
    }

    const historial =
      await equipoRepository.obtenerHistorialEquipo(id);

    res.json({
      mensaje: "Historial del equipo",
      equipo: {
        id: equipo.id,
        codigo: equipo.codigo,
        nombre: equipo.nombre,
        estado_actual: equipo.estado
      },
      total_prestamos: historial.length,
      historial
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al consultar historial"
    });
  }
}


async function marcarEquipoReparado(req, res) {
  try {
    const id = Number(req.params.id);
    const { descripcion } = req.body ?? {};

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        mensaje: "ID de equipo inválido"
      });
    }

    if (
      typeof descripcion !== "string" ||
      !descripcion.trim() ||
      descripcion.trim().length > 2000
    ) {
      return res.status(400).json({
        mensaje: "La descripción de la reparación es obligatoria y debe tener máximo 2000 caracteres"
      });
    }

    const equipo = await equipoRepository.recuperarEquipo(
      id,
      descripcion.trim(),
      req.usuario.id
    );

    return res.status(200).json({
      mensaje: "Equipo recuperado correctamente",
      equipo
    });

  } catch (error) {
    if (error.status === 404 || error.status === 409) {
      return res.status(error.status).json({
        mensaje: error.message
      });
    }

    console.error(error);

    return res.status(500).json({
      mensaje: "Error al recuperar el equipo"
    });
  }
}


async function consultarDisponibilidad(req, res) {
  try {
    const {
      buscar = "",
      estado = "",
      pagina = "1",
      limite = "10"
    } = req.query;

    const estadosPermitidos = [
      "DISPONIBLE",
      "PRESTADO",
      "MANTENIMIENTO",
      "INACTIVO"
    ];

    const numeroPagina = Number(pagina);
    const numeroLimite = Number(limite);

    if (
      typeof buscar !== "string" ||
      typeof estado !== "string" ||
      !Number.isSafeInteger(numeroPagina) ||
      numeroPagina < 1 ||
      !Number.isSafeInteger(numeroLimite) ||
      numeroLimite < 1 ||
      numeroLimite > 100 ||
      (estado && !estadosPermitidos.includes(estado))
    ) {
      return res.status(400).json({
        mensaje: "Parámetros de búsqueda inválidos"
      });
    }

    const resultado =
      await equipoRepository.obtenerDisponibilidadEquipos({
        buscar: buscar.trim(),
        estado,
        pagina: numeroPagina,
        limite: numeroLimite
      });

    return res.status(200).json({
      mensaje: "Disponibilidad consultada correctamente",
      ...resultado
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      mensaje: "Error al consultar disponibilidad"
    });
  }
}

module.exports = {
  listarEquipos,
  buscarEquipo,
  registrarEquipo,
  editarEquipo,
  borrarEquipo,
  historialEquipo,
  marcarEquipoReparado,
  consultarDisponibilidad
};
