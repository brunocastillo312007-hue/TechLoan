
let administradorSolicitudes = null;

if (!sessionStorage.getItem("techloan_token")) {
  window.location.replace("index.html");
} else {
  iniciarSolicitudes();
}

async function iniciarSolicitudes() {
  try {
    administradorSolicitudes = JSON.parse(
      sessionStorage.getItem("techloan_usuario") || "null"
    );

    if (
      !administradorSolicitudes ||
      administradorSolicitudes.rol !== "ADMIN"
    ) {
      window.location.replace("dashboard.html");
      return;
    }

    // Verificación real de permisos en el backend
    await peticionAPI("/usuarios/pendientes");

    document.getElementById("nombreUsuario")
      .textContent = administradorSolicitudes.nombre;

    document.getElementById("rolUsuario")
      .textContent = administradorSolicitudes.rol;

    document.getElementById("appLayout").hidden = false;

    document.getElementById("cerrarSesion")
      .addEventListener("click", cerrarSesionSolicitudes);

    document.getElementById("btnActualizarSolicitudes")
      .addEventListener("click", cargarSolicitudes);

    await cargarSolicitudes();

  } catch (error) {
    alert("No se pudo acceder al módulo: " + error.message);
    window.location.replace("dashboard.html");
  }
}

async function cargarSolicitudes() {
  const tabla = document.getElementById("tablaSolicitudes");
  const mensaje = document.getElementById("mensajeSolicitudes");
  const total = document.getElementById("totalSolicitudes");

  mensaje.textContent = "";
  tabla.replaceChildren();

  try {
    const datos = await peticionAPI("/usuarios/pendientes");

    const usuarios = Array.isArray(datos)
      ? datos
      : datos.usuarios;

    if (!Array.isArray(usuarios)) {
      throw new Error("Respuesta de solicitudes inválida");
    }

    total.textContent =
      `${usuarios.length} solicitudes pendientes`;

    if (usuarios.length === 0) {
      const fila = document.createElement("tr");
      const celda = document.createElement("td");

      celda.colSpan = 6;
      celda.textContent =
        "No existen solicitudes pendientes de aprobación.";

      fila.appendChild(celda);
      tabla.appendChild(fila);
      return;
    }

    usuarios.forEach(usuario => {
      const fila = document.createElement("tr");

      const valores = [
        usuario.id,
        usuario.nombre,
        usuario.correo,
        usuario.tipo,
        "Verificado"
      ];

      valores.forEach(valor => {
        const celda = document.createElement("td");
        celda.textContent = valor ?? "-";
        fila.appendChild(celda);
      });

      const acciones = document.createElement("td");
      acciones.className = "solicitudes-acciones";

      const btnAprobar = document.createElement("button");
      btnAprobar.type = "button";
      btnAprobar.className = "btn-activar";
      btnAprobar.textContent = "Aprobar";

      const btnRechazar = document.createElement("button");
      btnRechazar.type = "button";
      btnRechazar.className = "btn-desactivar";
      btnRechazar.textContent = "Rechazar";

      btnAprobar.addEventListener("click", () => {
        resolverSolicitud(usuario, "APROBAR");
      });

      btnRechazar.addEventListener("click", () => {
        resolverSolicitud(usuario, "RECHAZAR");
      });

      acciones.appendChild(btnAprobar);
      acciones.appendChild(btnRechazar);

      fila.appendChild(acciones);
      tabla.appendChild(fila);
    });

  } catch (error) {
    total.textContent = "No se pudieron cargar las solicitudes";
    mensaje.textContent =
      "Error al consultar solicitudes: " + error.message;
  }
}

async function resolverSolicitud(usuario, decision) {
  const accion =
    decision === "APROBAR" ? "aprobar" : "rechazar";

  const confirmado = confirm(
    `¿Seguro que deseas ${accion} la cuenta de "${usuario.nombre}"?`
  );

  if (!confirmado) return;

  const botones = document.querySelectorAll(
    ".solicitudes-acciones button"
  );

  botones.forEach(boton => {
    boton.disabled = true;
  });

  try {
    await peticionAPI(
      `/usuarios/${usuario.id}/aprobacion`,
      {
        method: "PATCH",
        body: JSON.stringify({ decision })
      }
    );

    await cargarSolicitudes();

    alert(
      decision === "APROBAR"
        ? "Cuenta aprobada correctamente."
        : "Cuenta rechazada correctamente."
    );

  } catch (error) {
    alert(
      "No se pudo procesar la solicitud: " + error.message
    );
  } finally {
    botones.forEach(boton => {
      boton.disabled = false;
    });
  }
}

function cerrarSesionSolicitudes() {
  sessionStorage.removeItem("techloan_token");
  sessionStorage.removeItem("techloan_usuario");
  window.location.replace("index.html");
}
