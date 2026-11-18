
let paginaPortal = 1;
let totalPaginasPortal = 1;
let busquedaPortal = "";
let estadoPortal = "";

const usuarioPortal = JSON.parse(
  sessionStorage.getItem("techloan_usuario") || "null"
);

const tokenPortal = sessionStorage.getItem("techloan_token");

function cerrarSesionPortal() {
  sessionStorage.removeItem("techloan_token");
  sessionStorage.removeItem("techloan_usuario");
  window.location.replace("index.html");
}

function crearCelda(fila, contenido) {
  const celda = document.createElement("td");
  celda.textContent = contenido ?? "-";
  fila.appendChild(celda);
  return celda;
}

function formatearFechaPortal(valor) {
  if (!valor) return "-";

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) return "-";

  return fecha.toLocaleString("es-EC", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function crearEstadoPortal(estado) {
  const span = document.createElement("span");

  const clases = {
    DISPONIBLE: "portal-estado-disponible",
    PRESTADO: "portal-estado-prestado",
    MANTENIMIENTO: "portal-estado-mantenimiento",
    INACTIVO: "portal-estado-inactivo",
    ACTIVO: "portal-estado-prestado",
    DEVUELTO: "portal-estado-disponible",
    VENCIDO: "portal-estado-mantenimiento"
  };

  span.className =
    `portal-estado ${clases[estado] || ""}`;

  span.textContent = estado;

  return span;
}

async function cargarDisponibilidadPortal() {
  const tabla = document.getElementById(
    "tablaDisponibilidad"
  );

  tabla.replaceChildren();

  try {
    const parametros = new URLSearchParams({
      pagina: paginaPortal,
      limite: 10
    });

    if (busquedaPortal) {
      parametros.set("buscar", busquedaPortal);
    }

    if (estadoPortal) {
      parametros.set("estado", estadoPortal);
    }

    const datos = await peticionAPI(
      `/equipos/disponibilidad?${parametros}`
    );

    totalPaginasPortal = Math.max(
      1,
      datos.total_paginas
    );

    document.getElementById(
      "paginaActualPortal"
    ).textContent =
      `Página ${paginaPortal} de ${totalPaginasPortal}`;

    document.getElementById(
      "paginaAnteriorPortal"
    ).disabled = paginaPortal <= 1;

    document.getElementById(
      "paginaSiguientePortal"
    ).disabled = paginaPortal >= totalPaginasPortal;

    if (datos.equipos.length === 0) {
      const fila = document.createElement("tr");
      crearCelda(
        fila,
        "No se encontraron equipos"
      ).colSpan = 5;

      tabla.appendChild(fila);
      return;
    }

    for (const equipo of datos.equipos) {
      const fila = document.createElement("tr");

      crearCelda(fila, equipo.codigo);
      crearCelda(fila, equipo.nombre);
      crearCelda(fila, equipo.marca);
      crearCelda(fila, equipo.modelo);

      const celdaEstado = document.createElement("td");

      celdaEstado.appendChild(
        crearEstadoPortal(equipo.estado)
      );

      fila.appendChild(celdaEstado);
      tabla.appendChild(fila);
    }

  } catch (error) {
    const fila = document.createElement("tr");

    crearCelda(
      fila,
      "Error: " + error.message
    ).colSpan = 5;

    tabla.appendChild(fila);
  }
}


/* ==========================================
   EQUIPOS DISPONIBLES EN INICIO
   ========================================== */

async function cargarEquiposInicioPortal() {

  const tabla = document.getElementById(
    "tablaEquiposInicio"
  );

  tabla.replaceChildren();

  try {

    let pagina = 1;
    let totalPaginas = 1;
    let totalEquipos = 0;

    do {

      const datos = await peticionAPI(
        `/equipos/disponibilidad?estado=DISPONIBLE&pagina=${pagina}&limite=100`
      );

      totalEquipos = Number(datos.total) || 0;
      totalPaginas = Number(datos.total_paginas) || 1;

      for (const equipo of datos.equipos) {

        const fila = document.createElement("tr");

        crearCelda(fila, equipo.codigo);
        crearCelda(fila, equipo.nombre);
        crearCelda(fila, equipo.marca);
        crearCelda(fila, equipo.modelo);

        const celdaEstado = document.createElement("td");

        celdaEstado.appendChild(
          crearEstadoPortal(equipo.estado)
        );

        fila.appendChild(celdaEstado);
        tabla.appendChild(fila);

      }

      pagina++;

    } while (pagina <= totalPaginas);

    // Actualizar la tarjeta de resumen
    document.getElementById(
      "totalDisponibles"
    ).textContent = totalEquipos;

    // Mostrar mensaje cuando no existen equipos
    if (tabla.children.length === 0) {

      const fila = document.createElement("tr");

      crearCelda(
        fila,
        "No hay equipos disponibles actualmente"
      ).colSpan = 5;

      tabla.appendChild(fila);

    }

  } catch (error) {

    const fila = document.createElement("tr");

    crearCelda(
      fila,
      "Error al cargar equipos: " + error.message
    ).colSpan = 5;

    tabla.replaceChildren(fila);

  }

}


async function cargarResumenPortal() {
  try {
    const datos = await peticionAPI(
      "/equipos/disponibilidad?estado=DISPONIBLE&pagina=1&limite=1"
    );

    document.getElementById(
      "totalDisponibles"
    ).textContent = datos.total;

  } catch (error) {
    document.getElementById(
      "totalDisponibles"
    ).textContent = "--";
  }
}



/* ==========================================
   ALERTAS DE DEVOLUCIÓN - INICIO
   ========================================== */

function mostrarAlertasPortal(prestamos) {

  const contenedor = document.getElementById(
    "alertasPortal"
  );

  contenedor.replaceChildren();

  const ahora = new Date();

  // Tiempo de anticipación: 48 horas
  const horasAnticipacion = 48;
  const milisegundosHora = 60 * 60 * 1000;

  const alertas = [];

  // Revisar únicamente préstamos activos
  for (const prestamo of prestamos) {

    if (prestamo.estado !== "ACTIVO") {
      continue;
    }

    if (!prestamo.fecha_limite) {
      continue;
    }

    const fechaLimite = new Date(
      prestamo.fecha_limite
    );

    if (Number.isNaN(fechaLimite.getTime())) {
      continue;
    }

    const diferencia =
      fechaLimite.getTime() - ahora.getTime();

    const horasRestantes =
      diferencia / milisegundosHora;

    // Préstamo vencido
    if (horasRestantes < 0) {

      alertas.push({
        prestamo,
        tipo: "vencida",
        diferencia
      });

    }

    // Préstamo próximo a vencer
    else if (horasRestantes <= horasAnticipacion) {

      alertas.push({
        prestamo,
        tipo: "proxima",
        diferencia
      });

    }

  }

  // Ordenar primero vencidos y luego próximos
  alertas.sort((a, b) => {

    return a.diferencia - b.diferencia;

  });

  // Si no existen alertas
  if (alertas.length === 0) {

    const mensaje = document.createElement("p");

    mensaje.textContent =
      "No tienes préstamos próximos a vencer ni vencidos.";

    contenedor.appendChild(mensaje);
    return;

  }

  // Mostrar alertas
  for (const alerta of alertas) {

    const { prestamo, tipo, diferencia } = alerta;

    const tarjeta = document.createElement("div");

    tarjeta.className =
      `portal-alerta-item ${tipo}`;

    const titulo = document.createElement("strong");

    titulo.textContent =
      tipo === "vencida"
        ? `⚠ Préstamo vencido: ${prestamo.equipo_nombre}`
        : `⏰ Próximo a vencer: ${prestamo.equipo_nombre}`;

    const fecha = document.createElement("p");

    fecha.textContent =
      "Fecha límite: " +
      formatearFechaPortal(prestamo.fecha_limite);

    const detalle = document.createElement("p");

    const horas = Math.abs(
      diferencia / milisegundosHora
    );

    if (tipo === "vencida") {

      detalle.textContent =
        `Tiempo de retraso: ${horas.toFixed(1)} horas`;

    } else {

      detalle.textContent =
        `Tiempo restante: ${horas.toFixed(1)} horas`;

    }

    tarjeta.appendChild(titulo);
    tarjeta.appendChild(fecha);
    tarjeta.appendChild(detalle);

    contenedor.appendChild(tarjeta);

  }

}

/* ==========================================
   PRÉSTAMOS ACTIVOS EN INICIO
   ========================================== */

function mostrarPrestamosInicioPortal(prestamos) {

  const tabla = document.getElementById(
    "tablaPrestamosInicio"
  );

  tabla.replaceChildren();

  const activos = prestamos.filter(
    prestamo => prestamo.estado === "ACTIVO"
  );

  // Actualizar la tarjeta del Inicio
  document.getElementById(
    "totalMisPrestamos"
  ).textContent = activos.length;

  // Cuando no existen préstamos activos
  if (activos.length === 0) {

    const fila = document.createElement("tr");

    crearCelda(
      fila,
      "No tienes préstamos activos actualmente"
    ).colSpan = 4;

    tabla.appendChild(fila);
    return;

  }

  // Mostrar los préstamos activos
  for (const prestamo of activos) {

    const fila = document.createElement("tr");

    crearCelda(
      fila,
      prestamo.equipo_nombre
    );

    crearCelda(
      fila,
      formatearFechaPortal(prestamo.fecha_prestamo)
    );

    crearCelda(
      fila,
      formatearFechaPortal(prestamo.fecha_limite)
    );

    const celdaEstado = document.createElement("td");

    const vencido =
      prestamo.vencido ||
      (
        prestamo.fecha_limite &&
        new Date(prestamo.fecha_limite) < new Date()
      );

    celdaEstado.appendChild(
      crearEstadoPortal(
        vencido ? "VENCIDO" : "ACTIVO"
      )
    );

    fila.appendChild(celdaEstado);
    tabla.appendChild(fila);

  }

}


async function cargarMisPrestamosPortal() {
  const tabla = document.getElementById(
    "tablaMisPrestamos"
  );


  try {
    const datos = await peticionAPI(
      "/prestamos/mis-prestamos"
    );

    // Limpiar la tabla solamente cuando llegan los datos
tabla.replaceChildren();

    // Actualizar los préstamos activos del Inicio
    mostrarPrestamosInicioPortal(datos.prestamos);
    
    // Actualizar las alertas de devolución del Inicio
    mostrarAlertasPortal(datos.prestamos);

    const activos = datos.prestamos.filter(
      prestamo => prestamo.estado === "ACTIVO"
    );

    document.getElementById(
      "totalMisPrestamos"
    ).textContent = activos.length;

    if (datos.prestamos.length === 0) {
      const fila = document.createElement("tr");

      crearCelda(
        fila,
        "Todavía no tienes préstamos registrados"
      ).colSpan = 5;

      tabla.appendChild(fila);
      return;
    }

    for (const prestamo of datos.prestamos) {
      const fila = document.createElement("tr");

      crearCelda(fila, prestamo.equipo_nombre);
      crearCelda(
        fila,
        formatearFechaPortal(prestamo.fecha_prestamo)
      );

      crearCelda(
        fila,
        formatearFechaPortal(prestamo.fecha_limite)
      );

      crearCelda(
        fila,
        formatearFechaPortal(prestamo.fecha_devolucion)
      );

      const celdaEstado = document.createElement("td");

      const estado =
        prestamo.vencido
          ? "VENCIDO"
          : prestamo.estado;

      celdaEstado.appendChild(
        crearEstadoPortal(estado)
      );

      fila.appendChild(celdaEstado);
      tabla.appendChild(fila);
    }

  } catch (error) {

    document.getElementById(
      "alertasPortal"
    ).textContent =
      "No se pudieron cargar las alertas de devolución.";

    const tablaInicio = document.getElementById(
  "tablaPrestamosInicio"
);

const filaInicio = document.createElement("tr");

crearCelda(
  filaInicio,
  "No se pudieron cargar los préstamos: " + error.message
).colSpan = 4;

tablaInicio.replaceChildren(filaInicio);

    document.getElementById(
      "totalMisPrestamos"
    ).textContent = "--";

    const fila = document.createElement("tr");

    crearCelda(
      fila,
      "Error: " + error.message
    ).colSpan = 5;

    tabla.appendChild(fila);
  }
}

async function cargarEquiposSolicitudPortal() {
  const select = document.getElementById(
    "equipoSolicitudPortal"
  );

  select.replaceChildren();

  const opcionInicial = document.createElement("option");
  opcionInicial.value = "";
  opcionInicial.textContent = "Seleccione un equipo";
  select.appendChild(opcionInicial);

  try {
    let pagina = 1;
    let totalPaginas = 1;

    do {
      const datos = await peticionAPI(
        `/equipos/disponibilidad?estado=DISPONIBLE&pagina=${pagina}&limite=100`
      );

      for (const equipo of datos.equipos) {
        const opcion = document.createElement("option");
        opcion.value = equipo.id;
        opcion.textContent =
          `${equipo.codigo} - ${equipo.nombre}`;

        select.appendChild(opcion);
      }

      totalPaginas = Number(datos.total_paginas) || 1;
      pagina++;

    } while (pagina <= totalPaginas);

  } catch (error) {
    console.error(error);
    opcionInicial.textContent =
      "Error al cargar equipos disponibles";
  }
}

async function enviarSolicitudPortal(evento) {
  evento.preventDefault();

  const equipoId = Number(
    document.getElementById("equipoSolicitudPortal").value
  );

  const fecha = document.getElementById(
    "fechaSolicitudPortal"
  ).value;

  const motivo = document.getElementById(
    "motivoSolicitudPortal"
  ).value.trim();

  const mensaje = document.getElementById(
    "mensajeSolicitudPortal"
  );

  const boton = document.querySelector(
    '#formSolicitudPortal button[type="submit"]'
  );

  mensaje.textContent = "";

  if (!equipoId || !fecha) {
    mensaje.textContent =
      "Seleccione un equipo y una fecha límite.";
    return;
  }

  const fechaISO = new Date(fecha).toISOString();

  if (new Date(fechaISO) <= new Date()) {
    mensaje.textContent =
      "La fecha límite debe ser futura.";
    return;
  }

  boton.disabled = true;

  try {
    const datos = await peticionAPI("/solicitudes", {
      method: "POST",
      body: JSON.stringify({
        equipo_id: equipoId,
        fecha_limite_solicitada: fechaISO,
        motivo_solicitud: motivo
      })
    });

    mensaje.textContent = datos.mensaje;

    document.getElementById(
      "formSolicitudPortal"
    ).reset();

    await cargarMisSolicitudesPortal();
    await cargarEquiposSolicitudPortal();

  } catch (error) {
    mensaje.textContent = error.message;

  } finally {
    boton.disabled = false;
  }
}


async function cargarMisSolicitudesPortal() {
  const tabla = document.getElementById(
    "tablaSolicitudesPortal"
  );

  tabla.replaceChildren();

  try {
    const datos = await peticionAPI(
      "/solicitudes/mis-solicitudes"
    );

    if (datos.solicitudes.length === 0) {
      const fila = document.createElement("tr");

      crearCelda(
        fila,
        "Todavía no tienes solicitudes registradas"
      ).colSpan = 6;

      tabla.appendChild(fila);
      return;
    }

    for (const solicitud of datos.solicitudes) {
      const fila = document.createElement("tr");

      crearCelda(fila, solicitud.id);
      crearCelda(fila, solicitud.equipo_nombre);

      crearCelda(
        fila,
        formatearFechaPortal(
          solicitud.fecha_limite_solicitada
        )
      );

      const celdaEstado = document.createElement("td");
      celdaEstado.appendChild(
        crearEstadoPortal(solicitud.estado)
      );
      fila.appendChild(celdaEstado);

      crearCelda(
        fila,
        solicitud.motivo_rechazo || "-"
      );

      const celdaAcciones = document.createElement("td");

      if (solicitud.estado === "PENDIENTE") {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "portal-btn-secundario";
        boton.textContent = "Cancelar";

        boton.addEventListener("click", async () => {
          if (!confirm("¿Cancelar esta solicitud?")) {
            return;
          }

          boton.disabled = true;

          try {
            await peticionAPI(
              `/solicitudes/${solicitud.id}/cancelar`,
              { method: "PATCH" }
            );

            await cargarMisSolicitudesPortal();
            await cargarEquiposSolicitudPortal();

          } catch (error) {
            alert(error.message);
            boton.disabled = false;
          }
        });

        celdaAcciones.appendChild(boton);

      } else {
        celdaAcciones.textContent = "-";
      }

      fila.appendChild(celdaAcciones);
      tabla.appendChild(fila);
    }

  } catch (error) {
    const fila = document.createElement("tr");

    crearCelda(
      fila,
      "Error: " + error.message
    ).colSpan = 6;

    tabla.appendChild(fila);
  }
}


/* ==========================================
   NAVEGACIÓN DEL PORTAL DE USUARIO
   ========================================== */

function configurarMenuPortal() {

  const secciones = {
    inicio: "seccionPortalInicio",
    equipos: "seccionPortalEquipos",
    solicitudes: "seccionPortalSolicitudes",
    prestamos: "seccionPortalPrestamos"
  };

  const botonesMenu = document.querySelectorAll(
    ".portal-menu-opcion"
  );

  const botonesAcceso = document.querySelectorAll(
    "[data-ir-seccion]"
  );

  function mostrarSeccion(nombreSeccion) {

    if (!secciones[nombreSeccion]) {
      return;
    }

    // Ocultar todas las secciones
    Object.values(secciones).forEach(id => {

      const seccion = document.getElementById(id);

      if (seccion) {
        seccion.hidden = true;
        seccion.classList.remove("activa");
      }

    });

    // Mostrar la sección seleccionada
    const seccionActiva = document.getElementById(
      secciones[nombreSeccion]
    );

    if (seccionActiva) {
      seccionActiva.hidden = false;
      seccionActiva.classList.add("activa");
    }

    // Actualizar el botón activo
    botonesMenu.forEach(boton => {

      const activo =
        boton.dataset.seccion === nombreSeccion;

      boton.classList.toggle("activo", activo);

      if (activo) {
        boton.setAttribute("aria-current", "page");
      } else {
        boton.removeAttribute("aria-current");
      }

    });

    // Volver al inicio de la página
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }

  // Eventos de los botones laterales
  botonesMenu.forEach(boton => {

    boton.addEventListener("click", () => {

      mostrarSeccion(boton.dataset.seccion);

    });

  });

  // Eventos de los accesos rápidos del Inicio
  botonesAcceso.forEach(boton => {

    boton.addEventListener("click", () => {

      mostrarSeccion(boton.dataset.irSeccion);

    });

  });

  // Mostrar Inicio al ingresar
  mostrarSeccion("inicio");

}



/* ==========================================
   ACTUALIZACIÓN AUTOMÁTICA DE PRÉSTAMOS
   ========================================== */

let actualizandoPrestamosPortal = false;

async function actualizarPrestamosAutomaticamente() {

  // Evitar consultas simultáneas
  if (actualizandoPrestamosPortal) {
    return;
  }

  // No consultar cuando la pestaña está oculta
  if (document.hidden) {
    return;
  }

  actualizandoPrestamosPortal = true;

  try {

    await cargarMisPrestamosPortal();

  } finally {

    actualizandoPrestamosPortal = false;

  }

}

function iniciarActualizacionAutomaticaPortal() {

  // Actualizar cada 60 segundos
  setInterval(() => {

    actualizarPrestamosAutomaticamente();

  }, 60000);

  // Actualizar al regresar a la pestaña
  document.addEventListener(
    "visibilitychange",
    () => {

      if (!document.hidden) {
        actualizarPrestamosAutomaticamente();
      }

    }
  );

}


function iniciarPortalUsuario() {
  if (!tokenPortal || !usuarioPortal) {
    window.location.replace("index.html");
    return;
  }

  if (usuarioPortal.rol !== "USUARIO") {
    window.location.replace("dashboard.html");
    return;
  }

  document.getElementById(
    "nombreUsuarioPortal"
  ).textContent = usuarioPortal.nombre;

// Configurar navegación del menú lateral
configurarMenuPortal();

  document.getElementById(
    "cerrarSesionPortal"
  ).addEventListener("click", cerrarSesionPortal);

  document.getElementById(
    "filtrarEquiposPortal"
  ).addEventListener("click", () => {
    busquedaPortal = document.getElementById(
      "buscarEquipoPortal"
    ).value.trim();

    estadoPortal = document.getElementById(
      "estadoEquipoPortal"
    ).value;

    paginaPortal = 1;
    cargarDisponibilidadPortal();
  });

  document.getElementById(
    "actualizarDisponibilidad"
  ).addEventListener("click", () => {
    cargarDisponibilidadPortal();
    cargarResumenPortal();
  });

  document.getElementById(
    "paginaAnteriorPortal"
  ).addEventListener("click", () => {
    if (paginaPortal > 1) {
      paginaPortal--;
      cargarDisponibilidadPortal();
    }
  });

  document.getElementById(
    "paginaSiguientePortal"
  ).addEventListener("click", () => {
    if (paginaPortal < totalPaginasPortal) {
      paginaPortal++;
      cargarDisponibilidadPortal();
    }
  });

  document.getElementById(
    "actualizarMisPrestamos"
  ).addEventListener("click", cargarMisPrestamosPortal);

  cargarDisponibilidadPortal();
  cargarEquiposInicioPortal();
  cargarMisPrestamosPortal();
  // Activar actualización automática
  iniciarActualizacionAutomaticaPortal();
  document.getElementById(
  "formSolicitudPortal"
).addEventListener("submit", enviarSolicitudPortal);

document.getElementById(
  "actualizarSolicitudesPortal"
).addEventListener("click", cargarMisSolicitudesPortal);

cargarEquiposSolicitudPortal();
cargarMisSolicitudesPortal();
}

document.addEventListener(
  "DOMContentLoaded",
  iniciarPortalUsuario
);
