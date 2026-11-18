
const estadisticaRepository = require(
  "../repositories/estadisticaRepository"
);

async function mostrarEstadisticas(req, res) {
  try {
    const resumen =
      await estadisticaRepository.obtenerEstadisticas();

    const prestamosPorDia =
      await estadisticaRepository.obtenerPrestamosUltimosDias();

    return res.status(200).json({
      mensaje: "Estadísticas generales de TechLoan",
      resumen,
      prestamos_ultimos_7_dias: prestamosPorDia
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      mensaje: "Error al consultar estadísticas"
    });
  }
}

module.exports = {
  mostrarEstadisticas
};
