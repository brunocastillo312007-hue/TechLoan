
const auditoriaRepository = require(
  "../repositories/auditoriaRepository"
);

async function listarAuditoria(req, res) {
  try {
    const registros =
      await auditoriaRepository.obtenerAuditoria();

    res.json({
      mensaje: "Historial de auditoría",
      total: registros.length,
      registros
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al consultar auditoría"
    });
  }
}

module.exports = {
  listarAuditoria
};
