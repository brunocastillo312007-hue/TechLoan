
const token = sessionStorage.getItem("techloan_token");

let paginaActual = 1;
let totalPaginas = 1;
const limite = 5;
let esAdmin = false;

if (!token) {
  window.location.replace("index.html");
} else {
  iniciarModuloEquipos();
}

async function iniciarModuloEquipos() {
  try {
    // Verificar sesión y permisos actuales
    await peticionAPI("/equipos?pagina=1&limite=1");

    const usuario = JSON.parse(
      sessionStorage.getItem("techloan_usuario") || "null"
    );

    if (usuario) {
      esAdmin = usuario.rol === "ADMIN";
      document.getElementById("nombreUsuario")
        .textContent = usuario.nombre;

      document.getElementById("rolUsuario")
        .textContent = usuario.rol;

      if (usuario.rol !== "ADMIN") {
        document.getElementById("menuUsuarios").remove();
        document.getElementById("menuAuditoria").remove();
      }
    }


    if (esAdmin) {
  document.getElementById("btnNuevoEquipo").hidden = false;
}

document.getElementById("columnaAcciones").hidden = false;

    document.getElementById("btnNuevoEquipo")
    .addEventListener("click", abrirNuevoEquipo);

    document.getElementById("cerrarModal")
    .addEventListener("click", cerrarModalEquipo);

    document.getElementById("cancelarEquipo")
    .addEventListener("click", cerrarModalEquipo);

    document.getElementById("formEquipo")
    .addEventListener("submit", guardarFormularioEquipo);

        // Eventos del historial de equipos
    document.getElementById("cerrarModalHistorial")
    .addEventListener("click", cerrarHistorialEquipo);

    document.getElementById("btnCerrarHistorial")
    .addEventListener("click", cerrarHistorialEquipo);


    document.getElementById("cerrarModalReparacion")
    .addEventListener("click", cerrarModalReparacion);

    document.getElementById("cancelarReparacion")
    .addEventListener("click", cerrarModalReparacion);

    document.getElementById("formReparacion")
    .addEventListener("submit", guardarReparacion);

    document.getElementById("appLayout").hidden = false;

    document.getElementById("cerrarSesion")
      .addEventListener("click", cerrarSesion);

    document.getElementById("formFiltros")
      .addEventListener("submit", evento => {
        evento.preventDefault();
        paginaActual = 1;
        cargarEquipos();
      });

    document.getElementById("limpiarFiltros")
      .addEventListener("click", () => {
        document.getElementById("formFiltros").reset();
        paginaActual = 1;
        cargarEquipos();
      });

    document.getElementById("btnAnterior")
      .addEventListener("click", () => {
        if (paginaActual > 1) {
          paginaActual--;
          cargarEquipos();
        }
      });

    document.getElementById("btnSiguiente")
      .addEventListener("click", () => {
        if (paginaActual < totalPaginas) {
          paginaActual++;
          cargarEquipos();
        }
      });

    await cargarEquipos();

  } catch (error) {
    alert("No se pudo iniciar el módulo: " + error.message);
    cerrarSesion();
  }
}

async function cargarEquipos() {
  const mensaje = document.getElementById("mensajeEquipos");
  const tabla = document.getElementById("tablaEquipos");

  mensaje.textContent = "";

  const parametros = new URLSearchParams({
    pagina: paginaActual,
    limite,
    ordenar: document.getElementById("ordenarEquipos").value,
    direccion: document.getElementById("direccionOrden").value
  });

  const buscar = document.getElementById("buscarEquipo").value.trim();
  const estado = document.getElementById("filtroEstado").value;
  const marca = document.getElementById("filtroMarca").value.trim();

  if (buscar) parametros.set("buscar", buscar);
  if (estado) parametros.set("estado", estado);
  if (marca) parametros.set("marca", marca);

  tabla.replaceChildren();

  const cargando = document.createElement("tr");
  const celda = document.createElement("td");
  celda.colSpan =   7;
  celda.textContent = "Cargando equipos...";
  cargando.appendChild(celda);
  tabla.appendChild(cargando);

  try {
    const datos = await peticionAPI(
      `/equipos?${parametros.toString()}`
    );

    totalPaginas = Math.max(1, Number(datos.total_paginas));

    document.getElementById("totalRegistros")
      .textContent = `${datos.total} registros`;

    document.getElementById("infoPagina")
      .textContent =
        `Página ${paginaActual} de ${totalPaginas}`;

    document.getElementById("btnAnterior")
      .disabled = paginaActual <= 1;

    document.getElementById("btnSiguiente")
      .disabled = paginaActual >= totalPaginas;

    tabla.replaceChildren();

    if (datos.equipos.length === 0) {
      const fila = document.createElement("tr");
      const celdaVacia = document.createElement("td");

      celdaVacia.colSpan =   7;
      celdaVacia.textContent =
        "No se encontraron equipos.";

      fila.appendChild(celdaVacia);
      tabla.appendChild(fila);
      return;
    }

    datos.equipos.forEach(equipo => {
      const fila = document.createElement("tr");

      const valores = [
        equipo.codigo,
        equipo.nombre,
        equipo.marca,
        equipo.modelo,
        equipo.numero_serie
      ];

      valores.forEach(valor => {
        const celda = document.createElement("td");
        celda.textContent = valor ?? "-";
        fila.appendChild(celda);
      });

      const celdaEstado = document.createElement("td");
      const etiqueta = document.createElement("span");

      etiqueta.className =
        `estado-etiqueta estado-${equipo.estado}`;

      etiqueta.textContent = equipo.estado;

      celdaEstado.appendChild(etiqueta);
      fila.appendChild(celdaEstado);

    
// Columna de acciones para ADMIN y OPERADOR
const celdaAcciones = document.createElement("td");

// Botón Historial: disponible para ambos roles
const btnHistorial = document.createElement("button");

btnHistorial.type = "button";
btnHistorial.textContent = "Historial";
btnHistorial.className = "btn-historial";

btnHistorial.addEventListener("click", () => {
  abrirHistorialEquipo(equipo);
});

celdaAcciones.appendChild(btnHistorial);

// Editar y eliminar: solamente ADMIN
if (esAdmin) {
  const btnEditar = document.createElement("button");

  btnEditar.type = "button";
  btnEditar.textContent = "Editar";
  btnEditar.className = "btn-accion btn-editar";

// Botón de recuperación exclusivo para ADMIN
if (equipo.estado === "MANTENIMIENTO") {

  const btnReparar = document.createElement("button");

  btnReparar.type = "button";
  btnReparar.textContent = "Marcar como reparado";
  btnReparar.className = "btn-accion btn-reparar";

  btnReparar.addEventListener("click", () => {
    abrirModalReparacion(equipo);
  });

  celdaAcciones.appendChild(btnReparar);
}

  btnEditar.addEventListener("click", () => {
    abrirEditarEquipo(equipo);
  });

  const btnEliminar = document.createElement("button");

  btnEliminar.type = "button";
  btnEliminar.textContent = "Eliminar";
  btnEliminar.className = "btn-accion btn-eliminar";

  btnEliminar.addEventListener("click", () => {
    eliminarEquipo(equipo);
  });

  celdaAcciones.append(btnEditar, btnEliminar);
}

fila.appendChild(celdaAcciones);

    
      tabla.appendChild(fila);
    });

  } catch (error) {
    tabla.replaceChildren();
    mensaje.textContent =
      "Error al cargar equipos: " + error.message;
  }
}

function cerrarSesion() {
  sessionStorage.removeItem("techloan_token");
  sessionStorage.removeItem("techloan_usuario");
  window.location.replace("index.html");
}


function abrirNuevoEquipo() {
  if (!esAdmin) return;

  document.getElementById("formEquipo").reset();
  document.getElementById("equipoId").value = "";
  document.getElementById("tituloModal")
    .textContent = "Registrar equipo";

  document.getElementById("errorFormulario")
    .textContent = "";

  document.getElementById("modalEquipo").hidden = false;
}

function abrirEditarEquipo(equipo) {
  if (!esAdmin) return;

  document.getElementById("formEquipo").reset();

  document.getElementById("equipoId").value = equipo.id;
  document.getElementById("equipoCodigo").value =
    equipo.codigo ?? "";
  document.getElementById("equipoNombre").value =
    equipo.nombre ?? "";
  document.getElementById("equipoMarca").value =
    equipo.marca ?? "";
  document.getElementById("equipoModelo").value =
    equipo.modelo ?? "";
  document.getElementById("equipoSerie").value =
    equipo.numero_serie ?? "";

  document.getElementById("tituloModal")
    .textContent = "Editar equipo";

  document.getElementById("errorFormulario")
    .textContent = "";

  document.getElementById("modalEquipo").hidden = false;
}

function cerrarModalEquipo() {
  document.getElementById("modalEquipo").hidden = true;
}

async function guardarFormularioEquipo(evento) {
  evento.preventDefault();

  if (!esAdmin) return;

  const id = document.getElementById("equipoId").value;
  const boton = document.getElementById("guardarEquipo");
  const error = document.getElementById("errorFormulario");

  error.textContent = "";

  const equipo = {
    codigo: document.getElementById("equipoCodigo").value.trim(),
    nombre: document.getElementById("equipoNombre").value.trim(),
    marca: document.getElementById("equipoMarca").value.trim() || null,
    modelo: document.getElementById("equipoModelo").value.trim() || null,
    numero_serie:
      document.getElementById("equipoSerie").value.trim() || null
  };

  if (!equipo.codigo || !equipo.nombre) {
    error.textContent =
      "El código y el nombre son obligatorios.";
    return;
  }

  const editando = Boolean(id);

  boton.disabled = true;
  boton.textContent = "Guardando...";

  try {
    await peticionAPI(
      editando ? `/equipos/${id}` : "/equipos",
      {
        method: editando ? "PUT" : "POST",
        body: JSON.stringify(equipo)
      }
    );

    cerrarModalEquipo();

    paginaActual = 1;
    await cargarEquipos();

    alert(
      editando
        ? "Equipo actualizado correctamente."
        : "Equipo registrado correctamente."
    );

  } catch (err) {
    error.textContent = err.message;
  } finally {
    boton.disabled = false;
    boton.textContent = "Guardar equipo";
  }
}

async function eliminarEquipo(equipo) {
  if (!esAdmin) return;

  const confirmar = confirm(
    `¿Seguro que deseas eliminar el equipo "${equipo.nombre}"?`
  );

  if (!confirmar) return;

  try {
    await peticionAPI(`/equipos/${equipo.id}`, {
      method: "DELETE"
    });

    await cargarEquipos();

    alert("Equipo eliminado correctamente.");

  } catch (error) {
    alert(
      "No se pudo eliminar el equipo: " + error.message
    );
  }
}


async function abrirHistorialEquipo(equipo) {
  const modal = document.getElementById("modalHistorial");
  const lista = document.getElementById("listaHistorial");
  const mensaje = document.getElementById("mensajeHistorial");

  document.getElementById("historialNombreEquipo")
    .textContent = equipo.nombre;

  document.getElementById("historialCodigoEquipo")
    .textContent = `Código: ${equipo.codigo}`;

  
document.getElementById("historialMarcaEquipo")
  .textContent = equipo.marca ?? "No registrada";

document.getElementById("historialModeloEquipo")
  .textContent = equipo.modelo ?? "No registrado";

document.getElementById("historialSerieEquipo")
  .textContent = equipo.numero_serie ?? "No registrado";

document.getElementById("historialEstadoEquipo")
  .textContent = equipo.estado ?? "No disponible";

document.getElementById("historialFechaRegistro")
  .textContent = equipo.fecha_registro
    ? formatearFechaHistorial(equipo.fecha_registro)
    : "Fecha no disponible";


  lista.replaceChildren();
  mensaje.textContent = "Cargando historial...";

  modal.hidden = false;

  try {
    const datos = await peticionAPI(
      `/equipos/${equipo.id}/historial`
    );

    console.log("HISTORIAL RECIBIDO:", datos);  

    const historial = Array.isArray(datos)
      ? datos
      : datos.historial ?? datos.prestamos ?? [];
    
      console.log("PRIMER PRÉSTAMO:", historial[0]);
      console.log("CAMPOS DISPONIBLES:", Object.keys(historial[0] ?? {}));
    mensaje.textContent = "";

    if (historial.length === 0) {
      const vacio = document.createElement("p");
      vacio.className = "historial-vacio";
      vacio.textContent =
        "Este equipo todavía no tiene préstamos registrados.";

      lista.appendChild(vacio);
      return;
    }

    historial.forEach(prestamo => {
      const item = document.createElement("article");

      const estado =
        prestamo.estado_prestamo ?? prestamo.estado ??
        (prestamo.fecha_devolucion ? "DEVUELTO" : "ACTIVO");

        item.className = estado === "ACTIVO"
        ? "historial-item activo"
        : "historial-item devuelto";

      const titulo = document.createElement("h4");

        const numeroPrestamo =
        prestamo.prestamo_id ?? prestamo.id ?? "N/D";

        titulo.textContent =
        `Préstamo #${numeroPrestamo} — ${estado}`;

      item.appendChild(titulo);

      agregarDatoHistorial(
        item,
        "Usuario",
        prestamo.usuario_nombre ?? prestamo.usuario_id
      );

      agregarDatoHistorial(
        item,
        "Fecha de préstamo",
        formatearFechaHistorial(prestamo.fecha_prestamo)
      );

      agregarDatoHistorial(
        item,
        "Fecha límite",
        formatearFechaHistorial(prestamo.fecha_limite)
      );

      if (prestamo.fecha_devolucion) {
        agregarDatoHistorial(
          item,
          "Fecha de devolución",
          formatearFechaHistorial(prestamo.fecha_devolucion)
        );
      }

      lista.appendChild(item);
    });

  } catch (error) {
    mensaje.textContent =
      "Error al cargar historial: " + error.message;
  }
}

function agregarDatoHistorial(contenedor, etiqueta, valor) {
  const parrafo = document.createElement("p");

  const titulo = document.createElement("strong");
  titulo.textContent = `${etiqueta}: `;

  const contenido = document.createElement("span");
  contenido.textContent = valor ?? "-";

  parrafo.appendChild(titulo);
  parrafo.appendChild(contenido);

  contenedor.appendChild(parrafo);
}

function formatearFechaHistorial(fecha) {
  if (!fecha) return "-";

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) return "-";

  return valor.toLocaleString("es-EC", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function cerrarHistorialEquipo() {
  document.getElementById("modalHistorial").hidden = true;
}


function abrirModalReparacion(equipo) {
  if (!esAdmin || equipo.estado !== "MANTENIMIENTO") {
    return;
  }

  document.getElementById("formReparacion").reset();

  document.getElementById("equipoIdReparacion").value =
    equipo.id;

  document.getElementById("nombreEquipoReparacion")
    .textContent =
      `Equipo: ${equipo.nombre} (${equipo.codigo})`;

  document.getElementById("errorReparacion")
    .textContent = "";

  document.getElementById("modalReparacion").hidden = false;
}


function cerrarModalReparacion() {
  document.getElementById("modalReparacion").hidden = true;
}


async function guardarReparacion(evento) {
  evento.preventDefault();

  if (!esAdmin) return;

  const id = document.getElementById(
    "equipoIdReparacion"
  ).value;

  const descripcion = document.getElementById(
    "descripcionReparacion"
  ).value.trim();

  const error = document.getElementById(
    "errorReparacion"
  );

  const boton = document.getElementById(
    "guardarReparacion"
  );

  error.textContent = "";

  if (!descripcion) {
    error.textContent =
      "Debes describir la reparación realizada.";
    return;
  }

  if (descripcion.length > 2000) {
    error.textContent =
      "La descripción no puede superar 2000 caracteres.";
    return;
  }

  const confirmar = confirm(
    "¿Confirmas que el equipo fue reparado y está listo para volver a prestarse?"
  );

  if (!confirmar) return;

  boton.disabled = true;
  boton.textContent = "Guardando...";

  try {

    await peticionAPI(
      `/equipos/${id}/recuperar`,
      {
        method: "PATCH",
        body: JSON.stringify({
          descripcion
        })
      }
    );

    cerrarModalReparacion();

    await cargarEquipos();

    alert(
      "Equipo recuperado correctamente. " +
      "Ahora se encuentra DISPONIBLE."
    );

  } catch (err) {

    error.textContent =
      "No se pudo recuperar el equipo: " + err.message;

  } finally {

    boton.disabled = false;
    boton.textContent = "Confirmar reparación";

  }
}
