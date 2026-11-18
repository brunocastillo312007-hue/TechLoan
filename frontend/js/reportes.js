
let usuarioReportes = null;
let alertasReportes = [];

if (!sessionStorage.getItem("techloan_token")) {
  window.location.replace("index.html");
} else {
  iniciarReportes();
}

async function iniciarReportes() {
  try {
    // Comprobar acceso mediante el backend.
    await peticionAPI("/prestamos/alertas/devolucion");

    usuarioReportes = JSON.parse(
      sessionStorage.getItem("techloan_usuario") || "null"
    );

    if (!usuarioReportes) {
      throw new Error("No se encontraron datos de sesión");
    }

    document.getElementById("nombreUsuario")
      .textContent = usuarioReportes.nombre;

    document.getElementById("rolUsuario")
      .textContent = usuarioReportes.rol;

    if (usuarioReportes.rol !== "ADMIN") {
      document.getElementById("menuUsuarios").remove();
      document.getElementById("menuAuditoria").remove();
    }

    document.getElementById("appLayout").hidden = false;

    document.getElementById("cerrarSesion")
      .addEventListener("click", cerrarSesionReportes);

    document.getElementById("actualizarReportes")
      .addEventListener("click", cargarReportes);

    document.getElementById("buscarReporte")
      .addEventListener("input", mostrarAlertas);

    document.getElementById("filtroReporte")
      .addEventListener("change", mostrarAlertas);

    await cargarReportes();

  } catch (error) {
    alert(
      "No se pudo acceder a reportes: " + error.message
    );

    window.location.replace("dashboard.html");
  }
}

async function cargarReportes() {
  const mensaje =
    document.getElementById("mensajeReportes");

  mensaje.textContent = "";

  try {
    const [datosVencidos, datosAlertas] =
      await Promise.all([
        peticionAPI("/prestamos/reportes/vencidos"),
        peticionAPI("/prestamos/alertas/devolucion")
      ]);

    const vencidos = Array.isArray(datosVencidos)
      ? datosVencidos
      : datosVencidos.prestamos ?? [];

    alertasReportes = Array.isArray(datosAlertas)
      ? datosAlertas
      : datosAlertas.alertas ?? [];

    const proximos = alertasReportes.filter(
      alerta =>
        alerta.tipo_alerta === "PROXIMO_A_VENCER"
    );

    document.getElementById("totalVencidos")
      .textContent = vencidos.length;

    document.getElementById("totalProximos")
      .textContent = proximos.length;

    mostrarAlertas();

  } catch (error) {
    mensaje.textContent =
      "Error al cargar reportes: " + error.message;
  }
}

function mostrarAlertas() {
  const tabla = document.getElementById("tablaAlertas");

  const busqueda =
    document.getElementById("buscarReporte")
      .value.trim().toLowerCase();

  const filtro =
    document.getElementById("filtroReporte").value;

  tabla.replaceChildren();

  const alertas = alertasReportes.filter(alerta => {
    const coincideTipo =
      !filtro || alerta.tipo_alerta === filtro;

    const texto = [
      alerta.prestamo_id,
      alerta.equipo_nombre,
      alerta.equipo_codigo,
      alerta.usuario_nombre
    ].join(" ").toLowerCase();

    return coincideTipo && texto.includes(busqueda);
  });

  document.getElementById("totalAlertas")
  .textContent = `${alertas.length} ${
    alertas.length === 1 ? "alerta" : "alertas"
  }`;

  if (alertas.length === 0) {
    const fila = document.createElement("tr");
    const celda = document.createElement("td");

    celda.colSpan = 5;
    celda.textContent =
      "No se encontraron alertas de devolución.";

    fila.appendChild(celda);
    tabla.appendChild(fila);
    return;
  }

  alertas.forEach(alerta => {
    const fila = document.createElement("tr");

    agregarCeldaReporte(
      fila,
      alerta.prestamo_id ?? alerta.id
    );

    agregarCeldaReporte(
      fila,
      alerta.equipo_nombre ?? alerta.equipo_id
    );

    agregarCeldaReporte(
      fila,
      alerta.usuario_nombre ?? alerta.usuario_id
    );

    agregarCeldaReporte(
      fila,
      formatearFechaReporte(alerta.fecha_limite)
    );

    const celdaEstado = document.createElement("td");
    const etiqueta = document.createElement("span");

    const vencido = alerta.tipo_alerta === "VENCIDO";

    etiqueta.className = vencido
      ? "reporte-estado reporte-vencido"
      : "reporte-estado reporte-proximo";

    etiqueta.textContent = vencido
      ? "VENCIDO"
      : "PRÓXIMO A VENCER";

    celdaEstado.appendChild(etiqueta);
    fila.appendChild(celdaEstado);

    tabla.appendChild(fila);
  });
}

function agregarCeldaReporte(fila, valor) {
  const celda = document.createElement("td");
  celda.textContent = valor ?? "-";
  fila.appendChild(celda);
}

function formatearFechaReporte(fecha) {
  if (!fecha) return "-";

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) return "-";

  return valor.toLocaleString("es-EC", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function cerrarSesionReportes() {
  sessionStorage.removeItem("techloan_token");
  sessionStorage.removeItem("techloan_usuario");
  window.location.replace("index.html");
}
