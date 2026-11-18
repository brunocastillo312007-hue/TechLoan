
const pool = require("../config/database");
const auditoriaRepository = require("./auditoriaRepository");

async function obtenerEquipos(filtros = {}) {
  const {
    buscar = "",
    estado = "",
    marca = "",
    ordenar = "id",
    direccion = "DESC",
    pagina = 1,
    limite = 10
  } = filtros;

  const condiciones = [];
  const valores = [];

  // Búsqueda por nombre, código, marca o modelo
  if (buscar) {
    valores.push(`%${buscar}%`);

    condiciones.push(
      `(nombre ILIKE $${valores.length}
        OR codigo ILIKE $${valores.length}
        OR marca ILIKE $${valores.length}
        OR modelo ILIKE $${valores.length})`
    );
  }

  // Filtro por estado
  if (estado) {
    valores.push(estado);
    condiciones.push(`estado = $${valores.length}`);
  }

  // Filtro por marca
  if (marca) {
    valores.push(`%${marca}%`);
    condiciones.push(`marca ILIKE $${valores.length}`);
  }

  const where = condiciones.length
    ? `WHERE ${condiciones.join(" AND ")}`
    : "";

  // Solo permitimos columnas conocidas para ordenar
  const columnasPermitidas = [
    "id", "codigo", "nombre",
    "marca", "estado", "fecha_registro"
  ];

  const columna = columnasPermitidas.includes(ordenar)
    ? ordenar
    : "id";

  const orden = direccion.toUpperCase() === "ASC"
    ? "ASC"
    : "DESC";

  // Contar todos los resultados filtrados
  const conteo = await pool.query(
    `SELECT COUNT(*) AS total
     FROM equipos ${where}`,
    valores
  );

  const total = Number(conteo.rows[0].total);

  // Calcular desde qué registro comenzar
  const offset = (pagina - 1) * limite;

  const valoresPaginados = [
    ...valores,
    limite,
    offset
  ];

  const consulta = `
    SELECT *
    FROM equipos
    ${where}
    ORDER BY ${columna} ${orden}, id DESC
    LIMIT $${valores.length + 1}
    OFFSET $${valores.length + 2}
  `;

  const resultado = await pool.query(
    consulta,
    valoresPaginados
  );

  return {
    total,
    pagina,
    limite,
    total_paginas: Math.ceil(total / limite),
    equipos: resultado.rows
  };
}


async function obtenerEquipoPorId(id) {
  const resultado = await pool.query(
    "SELECT * FROM equipos WHERE id = $1",
    [id]
  );
  return resultado.rows[0];
}


async function crearEquipo(equipo, administradorId) {
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const {
      codigo,
      nombre,
      marca,
      modelo,
      numero_serie
    } = equipo;

    const resultado = await cliente.query(
      `INSERT INTO equipos
       (codigo, nombre, marca, modelo, numero_serie)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [codigo, nombre, marca, modelo, numero_serie]
    );

    const nuevoEquipo = resultado.rows[0];

    await auditoriaRepository.registrarAuditoria(
      {
        usuario_id: administradorId,
        accion: "CREAR",
        entidad: "EQUIPO",
        entidad_id: nuevoEquipo.id,
        detalle: {
          codigo: nuevoEquipo.codigo,
          nombre: nuevoEquipo.nombre
        }
      },
      cliente
    );

    await cliente.query("COMMIT");

    return nuevoEquipo;

  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}




async function actualizarEquipo(id, equipo, administradorId) {
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const anterior = await cliente.query(
      "SELECT * FROM equipos WHERE id = $1 FOR UPDATE",
      [id]
    );

    if (anterior.rows.length === 0) {
      await cliente.query("ROLLBACK");
      return null;
    }

    const {
      codigo,
      nombre,
      marca,
      modelo,
      numero_serie
    } = equipo;

    const resultado = await cliente.query(
      `UPDATE equipos
       SET codigo = $1,
           nombre = $2,
           marca = $3,
           modelo = $4,
           numero_serie = $5
       WHERE id = $6
       RETURNING *`,
      [codigo, nombre, marca, modelo, numero_serie, id]
    );

    const equipoActualizado = resultado.rows[0];

    await auditoriaRepository.registrarAuditoria(
      {
        usuario_id: administradorId,
        accion: "ACTUALIZAR",
        entidad: "EQUIPO",
        entidad_id: Number(id),
        detalle: {
          anterior: anterior.rows[0],
          nuevo: equipoActualizado
        }
      },
      cliente
    );

    await cliente.query("COMMIT");

    return equipoActualizado;

  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}



async function eliminarEquipo(id, administradorId) {
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultado = await cliente.query(
      "DELETE FROM equipos WHERE id = $1 RETURNING *",
      [id]
    );

    if (resultado.rows.length === 0) {
      await cliente.query("ROLLBACK");
      return null;
    }

    const equipoEliminado = resultado.rows[0];

    await auditoriaRepository.registrarAuditoria(
      {
        usuario_id: administradorId,
        accion: "ELIMINAR",
        entidad: "EQUIPO",
        entidad_id: Number(id),
        detalle: equipoEliminado
      },
      cliente
    );

    await cliente.query("COMMIT");

    return equipoEliminado;

  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}



async function obtenerHistorialEquipo(id) {
  const resultado = await pool.query(
    `SELECT
       p.id AS prestamo_id,
       p.fecha_prestamo,
       p.fecha_limite,
       p.fecha_devolucion,
       p.estado AS estado_prestamo,
       u.nombre AS usuario_nombre,
       u.tipo AS usuario_tipo,
       r.nombre AS responsable_nombre,
       i.id AS incidencia_id,
       i.descripcion AS descripcion_incidencia,
       i.fecha_registro AS fecha_incidencia
     FROM prestamos p
     JOIN usuarios u
       ON p.usuario_id = u.id
     JOIN usuarios r
       ON p.responsable_id = r.id
     LEFT JOIN incidencias i
       ON i.prestamo_id = p.id
     WHERE p.equipo_id = $1
     ORDER BY p.fecha_prestamo DESC, p.id DESC`,
    [id]
  );

  return resultado.rows;
}


async function recuperarEquipo(id, descripcion, administradorId) {
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultado = await cliente.query(
      `SELECT *
       FROM equipos
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (resultado.rows.length === 0) {
      const error = new Error("Equipo no encontrado");
      error.status = 404;
      throw error;
    }

    const equipoAnterior = resultado.rows[0];

    if (equipoAnterior.estado !== "MANTENIMIENTO") {
      const error = new Error(
        "Solo se pueden recuperar equipos en mantenimiento"
      );
      error.status = 409;
      throw error;
    }

    const prestamos = await cliente.query(
      `SELECT id
       FROM prestamos
       WHERE equipo_id = $1
         AND estado = 'ACTIVO'`,
      [id]
    );

    if (prestamos.rows.length > 0) {
      const error = new Error(
        "El equipo tiene un préstamo activo"
      );
      error.status = 409;
      throw error;
    }

    const actualizado = await cliente.query(
      `UPDATE equipos
       SET estado = 'DISPONIBLE'
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    const equipoRecuperado = actualizado.rows[0];

    await auditoriaRepository.registrarAuditoria(
      {
        usuario_id: administradorId,
        accion: "RECUPERAR",
        entidad: "EQUIPO",
        entidad_id: id,
        detalle: {
          estado_anterior: equipoAnterior.estado,
          estado_nuevo: equipoRecuperado.estado,
          descripcion_reparacion: descripcion
        }
      },
      cliente
    );

    await cliente.query("COMMIT");

    return equipoRecuperado;

  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;

  } finally {
    cliente.release();
  }
}


async function obtenerDisponibilidadEquipos(filtros = {}) {
  const {
    buscar = "",
    estado = "",
    pagina = 1,
    limite = 10
  } = filtros;

  const condiciones = [];
  const valores = [];

  if (buscar) {
    valores.push(`%${buscar}%`);

    condiciones.push(
      `(codigo ILIKE $${valores.length}
        OR nombre ILIKE $${valores.length}
        OR marca ILIKE $${valores.length}
        OR modelo ILIKE $${valores.length})`
    );
  }

  if (estado) {
    valores.push(estado);
    condiciones.push(`estado = $${valores.length}`);
  }

  const where = condiciones.length
    ? `WHERE ${condiciones.join(" AND ")}`
    : "";

  const conteo = await pool.query(
    `SELECT COUNT(*) AS total
     FROM equipos
     ${where}`,
    valores
  );

  const total = Number(conteo.rows[0].total);
  const offset = (pagina - 1) * limite;

  const resultado = await pool.query(
    `SELECT
      id,
       codigo,
       nombre,
       marca,
       modelo,
       estado
     FROM equipos
     ${where}
     ORDER BY nombre ASC, codigo ASC
     LIMIT $${valores.length + 1}
     OFFSET $${valores.length + 2}`,
    [...valores, limite, offset]
  );

  return {
    total,
    pagina,
    limite,
    total_paginas: Math.ceil(total / limite),
    equipos: resultado.rows
  };
}

module.exports = {
  obtenerEquipos,
  obtenerEquipoPorId,
  crearEquipo,
  actualizarEquipo,
  eliminarEquipo,
  obtenerHistorialEquipo,
  recuperarEquipo,
  obtenerDisponibilidadEquipos
};
