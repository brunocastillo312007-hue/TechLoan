
let usuarioActual = null;

if (!sessionStorage.getItem("techloan_token")) {
  window.location.replace("index.html");
} else {
  iniciarPrestamos();
}

async function iniciarPrestamos() {
  try {
    // Comprobar la sesión contra el backend
    await peticionAPI("/prestamos");

    usuarioActual = JSON.parse(
      sessionStorage.getItem("techloan_usuario") || "null"
    );

    if (!usuarioActual) {
      throw new Error("No se encontraron datos de sesión");
    }

    document.getElementById("nombreUsuario")
      .textContent = usuarioActual.nombre;

    document.getElementById("rolUsuario")
      .textContent = usuarioActual.rol;

    if (usuarioActual.rol !== "ADMIN") {
      document.getElementById("menuUsuarios").remove();
      document.getElementById("menuAuditoria").remove();
    }

    document.getElementById("appLayout").hidden = false;

    document.getElementById("cerrarSesion")
      .addEventListener("click", cerrarSesionPrestamos);

    document.getElementById("btnNuevoPrestamo")
      .addEventListener("click", abrirModalPrestamo);

    document.getElementById("cerrarModalPrestamo")
      .addEventListener("click", cerrarModalPrestamo);

    document.getElementById("cancelarPrestamo")
      .addEventListener("click", cerrarModalPrestamo);

    document.getElementById("formPrestamo")
      .addEventListener("submit", registrarPrestamoWeb);
    
document.getElementById("cerrarModalDevolucion")
  .addEventListener("click", cerrarModalDevolucion);

document.getElementById("cancelarDevolucion")
  .addEventListener("click", cerrarModalDevolucion);

document.getElementById("devolucionDanado")
  .addEventListener("change", cambiarEstadoDanado);

document.getElementById("formDevolucion")
  .addEventListener("submit", registrarDevolucionWeb);


document.getElementById("actualizarSolicitudesAdmin")
  .addEventListener("click", cargarSolicitudesAdmin);

document.getElementById("cerrarModalRechazo")
  .addEventListener("click", cerrarModalRechazoSolicitud);

document.getElementById("cancelarRechazoSolicitud")
  .addEventListener("click", cerrarModalRechazoSolicitud);

document.getElementById("formRechazoSolicitud")
  .addEventListener("submit", rechazarSolicitudWeb);

await cargarSolicitudesAdmin();

    await cargarPrestamos();

  } catch (error) {
    alert("No se pudo iniciar el módulo: " + error.message);
    cerrarSesionPrestamos();
  }
}

async function cargarPrestamos() {
  const tabla = document.getElementById("tablaPrestamos");
  const mensaje = document.getElementById("mensajePrestamos");

  mensaje.textContent = "";
  tabla.replaceChildren();

  try {
    const datos = await peticionAPI("/prestamos");

    // El endpoint devuelve la lista de préstamos
    const prestamos = Array.isArray(datos)
      ? datos
      : datos.prestamos;

    document.getElementById("totalPrestamos")
      .textContent = `${prestamos.length} préstamos`;

    if (prestamos.length === 0) {
      const fila = document.createElement("tr");
      const celda = document.createElement("td");

      celda.colSpan = 8;
      celda.textContent = "No hay préstamos registrados.";

      fila.appendChild(celda);
      tabla.appendChild(fila);
      return;
    }

    prestamos.forEach(prestamo => {
      const fila = document.createElement("tr");

      const valores = [
        prestamo.id,
        prestamo.equipo_nombre ?? prestamo.equipo_id,
        prestamo.usuario_nombre ?? prestamo.usuario_id,
        prestamo.responsable_nombre ?? prestamo.responsable_id,
        formatearFecha(prestamo.fecha_prestamo),
        formatearFecha(prestamo.fecha_limite)
      ];

      valores.forEach(valor => {
        const celda = document.createElement("td");
        celda.textContent = valor ?? "-";
        fila.appendChild(celda);
      });

      const celdaEstado = document.createElement("td");
      const etiqueta = document.createElement("span");

      const vencido =
        prestamo.estado === "ACTIVO" &&
        new Date(prestamo.fecha_limite) < new Date();

      etiqueta.className = vencido
        ? "prestamo-estado prestamo-vencido"
        : `prestamo-estado prestamo-${prestamo.estado}`;

      etiqueta.textContent = vencido
        ? "VENCIDO"
        : prestamo.estado;

      
celdaEstado.appendChild(etiqueta);
fila.appendChild(celdaEstado);

// Columna de acciones
const celdaAcciones = document.createElement("td");

if (prestamo.estado === "ACTIVO") {
  const botonDevolver = document.createElement("button");

  botonDevolver.type = "button";
  botonDevolver.textContent = "Devolver";
  botonDevolver.className = "btn-devolver";

  botonDevolver.addEventListener("click", () => {
    abrirModalDevolucion(prestamo);
  });

  celdaAcciones.appendChild(botonDevolver);
} else {
  celdaAcciones.textContent = "Finalizado";
}

fila.appendChild(celdaAcciones);
tabla.appendChild(fila);

    });

  } catch (error) {
    mensaje.textContent =
      "Error al cargar préstamos: " + error.message;
  }
}

async function abrirModalPrestamo() {
  const modal = document.getElementById("modalPrestamo");
  const error = document.getElementById("errorPrestamo");

  error.textContent = "";

  document.getElementById("formPrestamo").reset();

  modal.hidden = false;

  try {
    await Promise.all([
      cargarEquiposDisponibles(),
      cargarUsuariosPrestamo()
    ]);

  } catch (err) {
    error.textContent = err.message;
  }
}

async function cargarEquiposDisponibles() {
  const select = document.getElementById("prestamoEquipo");

  select.replaceChildren(new Option(
    "Seleccione un equipo", ""
  ));

  let pagina = 1;
  let totalPaginas = 1;

  do {
    const datos = await peticionAPI(
      `/equipos?estado=DISPONIBLE&pagina=${pagina}&limite=100`
    );

    datos.equipos.forEach(equipo => {
      select.add(new Option(
        `${equipo.codigo} - ${equipo.nombre}`,
        equipo.id
      ));
    });

    totalPaginas = Number(datos.total_paginas);
    pagina++;

  } while (pagina <= totalPaginas);
}

async function cargarUsuariosPrestamo() {
  const select = document.getElementById("prestamoUsuario");

  select.replaceChildren(new Option(
    "Seleccione un usuario", ""
  ));

  const datos = await peticionAPI("/usuarios/solicitantes");

  const usuarios = Array.isArray(datos)
    ? datos
    : datos.usuarios;

  usuarios
    .forEach(usuario => {
      select.add(new Option(
        `${usuario.nombre} (${usuario.tipo})`,
        usuario.id
      ));
    });
}

async function registrarPrestamoWeb(evento) {
  evento.preventDefault();

  const boton = document.getElementById("guardarPrestamo");
  const error = document.getElementById("errorPrestamo");

  error.textContent = "";

  const equipo_id = Number(
    document.getElementById("prestamoEquipo").value
  );

  const usuario_id = Number(
    document.getElementById("prestamoUsuario").value
  );

  const fechaLocal = document.getElementById(
    "prestamoFechaLimite"
  ).value;

  const fecha = new Date(fechaLocal);

  if (
    !equipo_id ||
    !usuario_id ||
    !fechaLocal ||
    Number.isNaN(fecha.getTime()) ||
    fecha <= new Date()
  ) {
    error.textContent =
      "Selecciona un equipo, un usuario y una fecha futura.";
    return;
  }

  boton.disabled = true;
  boton.textContent = "Registrando...";

  console.log("Datos del préstamo:", {
  equipo_id,
  usuario_id,
  responsable_id: usuarioActual.id,
  fecha_limite: fecha.toISOString()
    });

  try {
    await peticionAPI("/prestamos", {
      method: "POST",
      body: JSON.stringify({
        equipo_id,
        usuario_id,
        responsable_id: usuarioActual.id,
        fecha_limite: fecha.toISOString()
      })
    });

    cerrarModalPrestamo();
    await cargarPrestamos();

    alert("Préstamo registrado correctamente.");

  } catch (err) {
    error.textContent = err.message;
  } finally {
    boton.disabled = false;
    boton.textContent = "Registrar préstamo";
  }
}

function cerrarModalPrestamo() {
  document.getElementById("modalPrestamo").hidden = true;
}

function formatearFecha(fecha) {
  if (!fecha) return "-";

  return new Date(fecha).toLocaleString("es-EC", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function cerrarSesionPrestamos() {
  sessionStorage.removeItem("techloan_token");
  sessionStorage.removeItem("techloan_usuario");
  window.location.replace("index.html");
}


function abrirModalDevolucion(prestamo) {
  const formulario =
    document.getElementById("formDevolucion");

  formulario.reset();

  document.getElementById("devolucionPrestamoId")
    .value = prestamo.id;

  document.getElementById("devolucionEquipo")
    .textContent =
      prestamo.equipo_nombre ?? `Equipo #${prestamo.equipo_id}`;

  document.getElementById("devolucionNumero")
    .textContent = `#${prestamo.id}`;

  document.getElementById("errorDevolucion")
    .textContent = "";

  cambiarEstadoDanado();

  document.getElementById("modalDevolucion")
    .hidden = false;
}

function cerrarModalDevolucion() {
  document.getElementById("modalDevolucion")
    .hidden = true;
}

function cambiarEstadoDanado() {
  const danado =
    document.getElementById("devolucionDanado").value === "true";

  const contenedor =
    document.getElementById("contenedorDescripcion");

  const descripcion =
    document.getElementById("devolucionDescripcion");

  contenedor.hidden = !danado;
  descripcion.required = danado;

  if (!danado) {
    descripcion.value = "";
  }
}

async function registrarDevolucionWeb(evento) {
  evento.preventDefault();

  const id = Number(
    document.getElementById("devolucionPrestamoId").value
  );

  const danado =
    document.getElementById("devolucionDanado").value === "true";

  const descripcion =
    document.getElementById("devolucionDescripcion")
      .value.trim();

  const error =
    document.getElementById("errorDevolucion");

  const boton =
    document.getElementById("guardarDevolucion");

  error.textContent = "";

  if (danado && !descripcion) {
    error.textContent =
      "Debes describir los daños del equipo.";
    return;
  }

  const confirmar = confirm(
    danado
      ? "¿Confirmas la devolución con daños? " +
        "Se registrará una incidencia."
      : "¿Confirmas la devolución del equipo " +
        "en buen estado?"
  );

  if (!confirmar) return;

  boton.disabled = true;
  boton.textContent = "Registrando...";

  try {
    await peticionAPI(
      `/prestamos/${id}/devolucion`,
      {
        method: "PATCH",
        body: JSON.stringify({
          danado,
          descripcion: danado ? descripcion : ""
        })
      }
    );

    cerrarModalDevolucion();

    await cargarPrestamos();

    alert(
      danado
        ? "Devolución registrada. " +
          "Se creó una incidencia y el equipo " +
          "pasó a mantenimiento."
        : "Devolución registrada correctamente. " +
          "El equipo vuelve a estar disponible."
    );

  } catch (err) {
    error.textContent = err.message;
  } finally {
    boton.disabled = false;
    boton.textContent = "Registrar devolución";
  }
}


async function cargarSolicitudesAdmin() {
  const tabla = document.getElementById("tablaSolicitudesAdmin");
  const mensaje = document.getElementById("mensajeSolicitudesAdmin");
  const total = document.getElementById("totalSolicitudesPendientes");

  mensaje.textContent = "";
  tabla.replaceChildren();

  try {
    const datos = await peticionAPI("/solicitudes/pendientes");
    const solicitudes = datos.solicitudes;

    total.textContent = `${solicitudes.length} solicitudes`;

    if (solicitudes.length === 0) {
      const fila = document.createElement("tr");
      const celda = document.createElement("td");

      celda.colSpan = 7;
      celda.textContent = "No hay solicitudes pendientes.";

      fila.appendChild(celda);
      tabla.appendChild(fila);
      return;
    }

    for (const solicitud of solicitudes) {
      const fila = document.createElement("tr");

      const valores = [
        solicitud.id,
        solicitud.usuario_nombre,
        solicitud.usuario_tipo,
        solicitud.equipo_nombre,
        formatearFecha(solicitud.fecha_limite_solicitada),
        solicitud.motivo_solicitud || "-"
      ];

      for (const valor of valores) {
        const celda = document.createElement("td");
        celda.textContent = valor ?? "-";
        fila.appendChild(celda);
      }

      const celdaAcciones = document.createElement("td");

      const botonAprobar = document.createElement("button");
      botonAprobar.type = "button";
      botonAprobar.className = "btn-nuevo";
      botonAprobar.textContent = "Aprobar";

      botonAprobar.addEventListener("click", () => {
        aprobarSolicitudWeb(solicitud.id);
      });

      const botonRechazar = document.createElement("button");
      botonRechazar.type = "button";
      botonRechazar.className = "btn-secundario";
      botonRechazar.textContent = "Rechazar";

      botonRechazar.addEventListener("click", () => {
        abrirModalRechazoSolicitud(solicitud.id);
      });

      celdaAcciones.appendChild(botonAprobar);
      celdaAcciones.appendChild(botonRechazar);

      fila.appendChild(celdaAcciones);
      tabla.appendChild(fila);
    }

  } catch (error) {
    total.textContent = "--";
    mensaje.textContent =
      "Error al cargar solicitudes: " + error.message;
  }
}


async function aprobarSolicitudWeb(id) {
  const confirmar = confirm(
    `¿Deseas aprobar la solicitud #${id}?\n` +
    "Se creará un préstamo y el equipo pasará a PRESTADO."
  );

  if (!confirmar) return;

  const mensaje = document.getElementById("mensajeSolicitudesAdmin");

  try {
    const resultado = await peticionAPI(
      `/solicitudes/${id}/aprobar`,
      { method: "PATCH" }
    );

    await Promise.all([
      cargarSolicitudesAdmin(),
      cargarPrestamos()
    ]);

    alert(
      `${resultado.mensaje}\n` +
      `Préstamo generado: #${resultado.prestamo.id}`
    );

  } catch (error) {
    mensaje.textContent = error.message;
    alert("No se pudo aprobar: " + error.message);
    await cargarSolicitudesAdmin();
  }
}


function abrirModalRechazoSolicitud(id) {
  document.getElementById("formRechazoSolicitud").reset();

  document.getElementById("rechazoSolicitudId").value = id;

  document.getElementById("errorRechazoSolicitud")
    .textContent = "";

  document.getElementById("modalRechazoSolicitud")
    .hidden = false;

  document.getElementById("motivoRechazoSolicitud").focus();
}

function cerrarModalRechazoSolicitud() {
  document.getElementById("modalRechazoSolicitud")
    .hidden = true;
}

async function rechazarSolicitudWeb(evento) {
  evento.preventDefault();

  const id = Number(
    document.getElementById("rechazoSolicitudId").value
  );

  const motivo = document.getElementById(
    "motivoRechazoSolicitud"
  ).value.trim();

  const error = document.getElementById("errorRechazoSolicitud");
  const boton = document.getElementById(
    "confirmarRechazoSolicitud"
  );

  error.textContent = "";

  if (!motivo) {
    error.textContent = "Debes indicar un motivo de rechazo.";
    return;
  }

  if (!confirm(`¿Confirmas el rechazo de la solicitud #${id}?`)) {
    return;
  }

  boton.disabled = true;
  boton.textContent = "Rechazando...";

  try {
    const resultado = await peticionAPI(
      `/solicitudes/${id}/rechazar`,
      {
        method: "PATCH",
        body: JSON.stringify({
          motivo_rechazo: motivo
        })
      }
    );

    cerrarModalRechazoSolicitud();
    await cargarSolicitudesAdmin();

    alert(resultado.mensaje);

  } catch (err) {
    error.textContent = err.message;

  } finally {
    boton.disabled = false;
    boton.textContent = "Confirmar rechazo";
  }
}

