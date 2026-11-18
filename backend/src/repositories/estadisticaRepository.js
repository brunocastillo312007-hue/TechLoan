
const pool = require("../config/database");

async function obtenerEstadisticas() {
  const resultado = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM equipos)::integer
        AS total_equipos,

      (SELECT COUNT(*) FROM equipos
       WHERE estado = 'DISPONIBLE')::integer
        AS equipos_disponibles,

      (SELECT COUNT(*) FROM equipos
       WHERE estado = 'PRESTADO')::integer
        AS equipos_prestados,

      (SELECT COUNT(*) FROM equipos
       WHERE estado = 'MANTENIMIENTO')::integer
        AS equipos_mantenimiento,

      (SELECT COUNT(*) FROM equipos
       WHERE estado = 'INACTIVO')::integer
        AS equipos_inactivos,

      (SELECT COUNT(*) FROM prestamos)::integer
        AS total_prestamos,

      (SELECT COUNT(*) FROM prestamos
       WHERE estado = 'ACTIVO')::integer
        AS prestamos_activos,

      (SELECT COUNT(*) FROM prestamos
       WHERE estado = 'DEVUELTO')::integer
        AS prestamos_devueltos,

      (SELECT COUNT(*) FROM prestamos
       WHERE estado = 'ACTIVO'
         AND fecha_limite < CURRENT_TIMESTAMP)::integer
        AS prestamos_vencidos,

      (SELECT COUNT(*) FROM incidencias)::integer
        AS total_incidencias,

      (SELECT COUNT(*) FROM usuarios
       WHERE activo = TRUE)::integer
        AS usuarios_activos
  `);

  return resultado.rows[0];
}

async function obtenerPrestamosUltimosDias() {
  const resultado = await pool.query(`
    SELECT
      fecha::date::text AS fecha,
      COUNT(p.id)::integer AS cantidad
    FROM generate_series(
      CURRENT_DATE - INTERVAL '6 days',
      CURRENT_DATE,
      INTERVAL '1 day'
    ) AS fechas(fecha)
    LEFT JOIN prestamos p
      ON p.fecha_prestamo >= fechas.fecha
     AND p.fecha_prestamo < fechas.fecha + INTERVAL '1 day'
    GROUP BY fechas.fecha
    ORDER BY fechas.fecha ASC
  `);

  return resultado.rows;
}

module.exports = {
  obtenerEstadisticas,
  obtenerPrestamosUltimosDias
};
