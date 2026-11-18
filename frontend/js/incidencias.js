
let usuarioIncidencias = null;
let registrosIncidencias = [];

if (!sessionStorage.getItem("techloan_token")) {
  window.location.replace("index.html");
} else {
  iniciarIncidencias();
}

async function iniciarIncidencias() {
  try {
    // Verificar autorización con el backend
    await peticionAPI("/incidencias");

    usuarioIncidencias = JSON.parse(
      sessionStorage.getItem("techloan_usuario") || "null"
    );

    if (!usuarioIncidencias) {
      throw new Error("No se encontraron datos de sesión");
    }

    document.getElementById("nombreUsuario")
      .textContent = usuarioIncidencias.nombre;

    document.getElementById("rolUsuario")
      .textContent = usuarioIncidencias.rol;

    if (usuarioIncidencias.rol !== "ADMIN") {
      document.getElementById("menuUsuarios").remove();
      document.getElementById("menuAuditoria").remove();
    }

    document.getElementById("appLayout").hidden = false;

    document.getElementById("cerrarSesion")
      .addEventListener("click", cerrarSesionIncidencias);

    document.getElementById("actualizarIncidencias")
      .addEventListener("click", cargarIncidencias);

    document.getElementById("buscarIncidencia")
      .addEventListener("input", mostrarIncidencias);

    document.getElementById("filtroEstadoIncidencia")
      .addEventListener("change", mostrarIncidencias);

    await cargarIncidencias();

  } catch (error) {
    alert(
      "No se pudo iniciar el módulo: " + error.message
    );

    window.location.replace("dashboard.html");
  }
}

async function cargarIncidencias() {
  const mensaje =
    document.getElementById("mensajeIncidencias");

  mensaje.textContent = "";

  try {
    const [datos, datosEquipos] = await Promise.all([
      peticionAPI("/incidencias"),
      peticionAPI("/equipos?estado=MANTENIMIENTO&pagina=1&limite=1")
    ]);

    registrosIncidencias = Array.isArray(datos)
      ? datos
      : datos.incidencias ?? [];

    if (!Array.isArray(registrosIncidencias)) {
      throw new Error("Formato de incidencias inesperado");
    }

    document.getElementById("totalIncidencias")
      .textContent = registrosIncidencias.length;

    // Total real de equipos actualmente en mantenimiento
    document.getElementById("totalMantenimiento")
      .textContent = datosEquipos.total ?? 0;

    mostrarIncidencias();

  } catch (error) {
    mensaje.textContent =
      "Error al cargar incidencias: " + error.message;
  }
}

function mostrarIncidencias() {
  const tabla =
    document.getElementById("tablaIncidencias");

  const busqueda =
    document.getElementById("buscarIncidencia")
      .value.trim().toLowerCase();

  const estado =
    document.getElementById("filtroEstadoIncidencia").value;

  tabla.replaceChildren();

  const incidencias = registrosIncidencias.filter(incidencia => {
    const coincideEstado =
      !estado || incidencia.equipo_estado === estado;

    const texto = [
      incidencia.id,
      incidencia.prestamo_id,
      incidencia.equipo_nombre,
      incidencia.equipo_codigo,
      incidencia.responsable_nombre,
      incidencia.descripcion
    ].join(" ").toLowerCase();

    return coincideEstado && texto.includes(busqueda);
  });

  document.getElementById("totalRegistrosIncidencias")
    .textContent = `${incidencias.length} registros`;

  if (incidencias.length === 0) {
    const fila = document.createElement("tr");
    const celda = document.createElement("td");

    celda.colSpan = 8;
    celda.textContent = "No se encontraron incidencias.";

    fila.appendChild(celda);
    tabla.appendChild(fila);
    return;
  }

  incidencias.forEach(incidencia => {
    const fila = document.createElement("tr");

    agregarCeldaIncidencia(fila, incidencia.id);
    agregarCeldaIncidencia(fila, incidencia.equipo_nombre);
    agregarCeldaIncidencia(fila, incidencia.equipo_codigo);
    agregarCeldaIncidencia(fila, incidencia.prestamo_id);
    agregarCeldaIncidencia(fila, incidencia.responsable_nombre);

    const celdaDescripcion = document.createElement("td");
    celdaDescripcion.className = "incidencias-descripcion";
    celdaDescripcion.textContent =
      incidencia.descripcion ?? "-";

    fila.appendChild(celdaDescripcion);

    const celdaEstado = document.createElement("td");
    const etiqueta = document.createElement("span");

    const estadoEquipo =
      incidencia.equipo_estado ?? "INACTIVO";

    etiqueta.className =
      `incidencia-estado incidencia-${estadoEquipo}`;

    etiqueta.textContent = estadoEquipo;

    celdaEstado.appendChild(etiqueta);
    fila.appendChild(celdaEstado);

    agregarCeldaIncidencia(
      fila,
      formatearFechaIncidencia(incidencia.fecha_registro)
    );

    tabla.appendChild(fila);
  });
}

function agregarCeldaIncidencia(fila, valor) {
  const celda = document.createElement("td");
  celda.textContent = valor ?? "-";
  fila.appendChild(celda);
}

function formatearFechaIncidencia(fecha) {
  if (!fecha) return "-";

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) return "-";

  return valor.toLocaleString("es-EC", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function cerrarSesionIncidencias() {
  sessionStorage.removeItem("techloan_token");
  sessionStorage.removeItem("techloan_usuario");
  window.location.replace("index.html");
}
