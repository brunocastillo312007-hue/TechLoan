
const pool = require("../config/database");

async function obtenerIncidencias() {
  const resultado = await pool.query(`
    SELECT
      i.id,
      i.prestamo_id,
      i.equipo_id,
      e.codigo AS equipo_codigo,
      e.nombre AS equipo_nombre,
      e.estado AS equipo_estado,
      i.responsable_id,
      u.nombre AS responsable_nombre,
      i.descripcion,
      i.fecha_registro
    FROM incidencias i
    INNER JOIN equipos e
      ON i.equipo_id = e.id
    INNER JOIN usuarios u
      ON i.responsable_id = u.id
    ORDER BY i.fecha_registro DESC, i.id DESC
  `);

  return resultado.rows;
}

module.exports = {
  obtenerIncidencias
};
