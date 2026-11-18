
const incidenciaRepository = require(
  "../repositories/incidenciaRepository"
);

async function listarIncidencias(req, res) {
  try {
    const incidencias =
      await incidenciaRepository.obtenerIncidencias();

    return res.status(200).json({
      mensaje: "Incidencias consultadas correctamente",
      total: incidencias.length,
      incidencias
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      mensaje: "Error al consultar incidencias"
    });
  }
}

module.exports = {
  listarIncidencias
};
