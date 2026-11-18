
const token = sessionStorage.getItem("techloan_token");


if (!token) {
  window.location.replace("index.html");
} else {
  iniciarDashboard();
}

async function iniciarDashboard() {
  const errorDashboard =
    document.getElementById("errorDashboard");

  try {
    // Verificar el token contra el backend
    const datos = await peticionAPI("/estadisticas");

    const usuarioGuardado = JSON.parse(
      sessionStorage.getItem("techloan_usuario") || "null"
    );


    if (usuarioGuardado?.rol === "USUARIO") {
  window.location.replace("portal-usuario.html");
  return;
  }

    if (usuarioGuardado) {
      document.getElementById("nombreUsuario")
        .textContent = usuarioGuardado.nombre;

      document.getElementById("rolUsuario")
        .textContent = usuarioGuardado.rol;

      if (usuarioGuardado.rol !== "ADMIN") {
        document.getElementById("menuUsuarios").remove();
        document.getElementById("menuAuditoria").remove();
      }
    }

    document.getElementById("appLayout").hidden = false;

    document.getElementById("cerrarSesion")
      .addEventListener("click", cerrarSesion);

    mostrarEstadisticas(datos.resumen);

    mostrarGrafico(datos.prestamos_ultimos_7_dias);

    await cargarAlertas();

  } catch (error) {
    errorDashboard.textContent = error.message;

    if (
      error.message.includes("Token") ||
      error.message.includes("Acceso denegado") ||
      error.message.includes("desactivada") ||
      error.message.includes("Usuario no encontrado")
    ) {
      cerrarSesion();
    } else {
      document.getElementById("appLayout").hidden = false;
      document.getElementById("cerrarSesion")
        .addEventListener("click", cerrarSesion);
    }
  }
}

function mostrarEstadisticas(resumen) {
  document.getElementById("totalEquipos")
    .textContent = resumen.total_equipos;

  document.getElementById("equiposDisponibles")
    .textContent = resumen.equipos_disponibles;

  document.getElementById("prestamosActivos")
    .textContent = resumen.prestamos_activos;

  document.getElementById("prestamosVencidos")
    .textContent = resumen.prestamos_vencidos;
}

function mostrarGrafico(prestamos) {
  const canvas = document.getElementById("graficoPrestamos");

  if (typeof Chart === "undefined") {
    canvas.replaceWith(
      document.createTextNode("No se pudo cargar el gráfico.")
    );
    return;
  }

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: prestamos.map(p => p.fecha),
      datasets: [{
        label: "Préstamos registrados",
        data: prestamos.map(p => p.cantidad),
        backgroundColor: "#2563eb",
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  });
}

async function cargarAlertas() {
  const contenedor = document.getElementById("listaAlertas");

  try {
    const datos = await peticionAPI("/prestamos/alertas/devolucion");

    contenedor.replaceChildren();

    if (datos.alertas.length === 0) {
      contenedor.textContent =
        "No existen alertas de devolución pendientes.";
      return;
    }

    datos.alertas.forEach(alerta => {
      const elemento = document.createElement("div");

      elemento.className = alerta.tipo_alerta === "VENCIDO"
        ? "alerta-item alerta-vencida"
        : "alerta-item alerta-proxima";

      const titulo = document.createElement("strong");
      titulo.textContent =
        `${alerta.equipo_nombre} (${alerta.equipo_codigo})`;

      const usuario = document.createElement("p");
      usuario.textContent =
        `Usuario: ${alerta.usuario_nombre}`;

      const estado = document.createElement("p");
      estado.textContent = alerta.tipo_alerta === "VENCIDO"
        ? "Estado: Préstamo vencido"
        : `Estado: Próximo a vencer (${alerta.horas_restantes} horas)`;

      elemento.append(titulo, usuario, estado);
      contenedor.appendChild(elemento);
    });

  } catch (error) {
    contenedor.textContent =
      "No se pudieron cargar las alertas: " + error.message;
  }
}

function cerrarSesion() {
  sessionStorage.removeItem("techloan_token");
  sessionStorage.removeItem("techloan_usuario");
  window.location.replace("index.html");
}
