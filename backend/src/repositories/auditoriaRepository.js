
const pool = require("../config/database");

async function registrarAuditoria(datos, cliente = pool) {
  const {
    usuario_id,
    accion,
    entidad,
    entidad_id,
    detalle = {}
  } = datos;

  const resultado = await cliente.query(
    `INSERT INTO auditoria
      (usuario_id, accion, entidad, entidad_id, detalle)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING *`,
    [
      usuario_id,
      accion,
      entidad,
      entidad_id,
      JSON.stringify(detalle)
    ]
  );

  return resultado.rows[0];
}

async function obtenerAuditoria() {
  const resultado = await pool.query(
    `SELECT
       a.id,
       a.accion,
       a.entidad,
       a.entidad_id,
       a.detalle,
       a.fecha,
       u.nombre AS usuario_nombre
     FROM auditoria a
     LEFT JOIN usuarios u ON a.usuario_id = u.id
     ORDER BY a.fecha DESC, a.id DESC
     LIMIT 100`
  );

  return resultado.rows;
}

module.exports = {
  registrarAuditoria,
  obtenerAuditoria
};
