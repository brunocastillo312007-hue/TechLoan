
let administradorAuditoria = null;
let registrosAuditoria = [];

if (!sessionStorage.getItem("techloan_token")) {
  window.location.replace("index.html");
} else {
  iniciarAuditoria();
}

async function iniciarAuditoria() {
  try {
    // El backend debe autorizar la consulta.
    await peticionAPI("/auditoria");

    administradorAuditoria = JSON.parse(
      sessionStorage.getItem("techloan_usuario") || "null"
    );

    if (
      !administradorAuditoria ||
      administradorAuditoria.rol !== "ADMIN"
    ) {
      window.location.replace("dashboard.html");
      return;
    }

    document.getElementById("nombreUsuario")
      .textContent = administradorAuditoria.nombre;

    document.getElementById("rolUsuario")
      .textContent = administradorAuditoria.rol;

    document.getElementById("appLayout").hidden = false;

    document.getElementById("cerrarSesion")
      .addEventListener("click", cerrarSesionAuditoria);

    document.getElementById("actualizarAuditoria")
      .addEventListener("click", cargarAuditoria);

    document.getElementById("buscarAuditoria")
      .addEventListener("input", mostrarAuditoria);

    document.getElementById("filtroEntidad")
      .addEventListener("change", mostrarAuditoria);

    await cargarAuditoria();

  } catch (error) {
    alert(
      "No se pudo acceder a auditoría: " +
      error.message
    );

    window.location.replace("dashboard.html");
  }
}

async function cargarAuditoria() {
  const mensaje =
    document.getElementById("mensajeAuditoria");

  mensaje.textContent = "";

  try {
    const datos = await peticionAPI("/auditoria");

    registrosAuditoria = Array.isArray(datos)
      ? datos
      : datos.auditoria ?? datos.registros ?? [];

    mostrarAuditoria();

  } catch (error) {
    mensaje.textContent =
      "Error al cargar auditoría: " + error.message;
  }
}

function mostrarAuditoria() {
  const tabla =
    document.getElementById("tablaAuditoria");

  const busqueda =
    document.getElementById("buscarAuditoria")
      .value.trim().toLowerCase();

  const entidad =
    document.getElementById("filtroEntidad").value;

  tabla.replaceChildren();

  const registros = registrosAuditoria.filter(registro => {
    const coincideEntidad =
      !entidad || registro.entidad === entidad;

    const texto = [
    registro.id,
    registro.usuario_nombre,
    registro.usuario_id,
    registro.accion,
    registro.entidad,
    registro.entidad_id
    ].join(" ").toLowerCase();

    const coincideBusqueda = texto.includes(busqueda);

    return coincideEntidad && coincideBusqueda;
  });

  document.getElementById("totalAuditoria")
    .textContent = `${registros.length} registros`;

  if (registros.length === 0) {
    const fila = document.createElement("tr");
    const celda = document.createElement("td");

    celda.colSpan = 7;
    celda.textContent = "No se encontraron registros.";

    fila.appendChild(celda);
    tabla.appendChild(fila);
    return;
  }

  registros.forEach(registro => {
    const fila = document.createElement("tr");

    agregarCelda(fila, registro.id);
    agregarCelda(
    fila,
    registro.usuario_nombre ?? registro.usuario_id ?? "Sistema"
    );

    const celdaAccion = document.createElement("td");
    const etiqueta = document.createElement("span");

    etiqueta.className = "auditoria-accion";
    etiqueta.textContent = registro.accion;

    celdaAccion.appendChild(etiqueta);
    fila.appendChild(celdaAccion);

    agregarCelda(fila, registro.entidad);
    agregarCelda(fila, registro.entidad_id);

    const celdaDetalle = document.createElement("td");

    celdaDetalle.appendChild(
    crearDetalleAuditoria(registro)
    );

    fila.appendChild(celdaDetalle);

    agregarCelda(
      fila,
      formatearFechaAuditoria(registro.fecha)
    );

    tabla.appendChild(fila);
  });
}

function agregarCelda(fila, valor) {
  const celda = document.createElement("td");
  celda.textContent = valor ?? "-";
  fila.appendChild(celda);
}

function formatearFechaAuditoria(fecha) {
  if (!fecha) return "-";

  return new Date(fecha).toLocaleString("es-EC", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function cerrarSesionAuditoria() {
  sessionStorage.removeItem("techloan_token");
  sessionStorage.removeItem("techloan_usuario");
  window.location.replace("index.html");
}


function crearDetalleAuditoria(registro) {
  const contenedor = document.createElement("div");
  contenedor.className = "auditoria-detalle";

  const datos = registro.detalle ?? {};

  const titulos = {
    "CREAR_PRESTAMO": "Préstamo registrado",
    "DEVOLVER_PRESTAMO": "Devolución registrada",
    "CREAR_USUARIO": "Usuario registrado",
    "ACTIVAR_USUARIO": "Usuario activado",
    "DESACTIVAR_USUARIO": "Usuario desactivado",
    "CREAR_EQUIPO": "Equipo registrado",
    "MODIFICAR_EQUIPO": "Equipo modificado",
    "ELIMINAR_EQUIPO": "Equipo eliminado"
  };

  const clave = `${registro.accion}_${registro.entidad}`;

  const titulo = document.createElement("strong");
  titulo.className = "auditoria-detalle-titulo";
  titulo.textContent =
    titulos[clave] ?? `${registro.accion} ${registro.entidad}`;

  contenedor.appendChild(titulo);

  const etiquetas = {
    equipo_id: "Equipo",
    usuario_id: "Usuario",
    responsable_id: "Responsable",
    prestamo_id: "Préstamo",
    nombre: "Nombre",
    codigo: "Código",
    correo: "Correo",
    rol: "Rol",
    tipo: "Tipo",
    marca: "Marca",
    modelo: "Modelo",
    descripcion: "Descripción",
    fecha_limite: "Fecha límite",
    danado: "Presenta daños",
    estado_anterior: "Estado anterior",
    estado_nuevo: "Estado nuevo"
  };

  const formatearValor = (clave, valor) => {
    if (valor === null || valor === undefined) {
      return "-";
    }

    if (typeof valor === "boolean") {
      if (clave === "danado") {
        return valor ? "Sí" : "No";
      }

      return valor ? "Activo" : "Inactivo";
    }

    if (clave.startsWith("fecha_")) {
      const fecha = new Date(valor);

      if (!Number.isNaN(fecha.getTime())) {
        return fecha.toLocaleString("es-EC", {
          dateStyle: "short",
          timeStyle: "short"
        });
      }
    }

    if (typeof valor === "object") {
      return JSON.stringify(valor);
    }

    return String(valor);
  };

  // Mostrar objetos anteriores y nuevos de forma ordenada
if (
  datos.anterior &&
  typeof datos.anterior === "object" &&
  datos.nuevo &&
  typeof datos.nuevo === "object"
) {
  const comparacion = document.createElement("div");
  comparacion.className = "auditoria-comparacion";

  comparacion.appendChild(
    crearBloqueComparacion("Antes", datos.anterior)
  );

  comparacion.appendChild(
    crearBloqueComparacion("Después", datos.nuevo)
  );

  contenedor.appendChild(comparacion);

  return contenedor;
}

  const campos = Object.entries(datos);

  if (campos.length === 0) {
    const vacio = document.createElement("span");
    vacio.textContent = "Sin detalles adicionales";
    contenedor.appendChild(vacio);
    return contenedor;
  }

  campos.forEach(([clave, valor]) => {
    const fila = document.createElement("div");
    fila.className = "auditoria-detalle-fila";

    const etiqueta = document.createElement("span");
    etiqueta.className = "auditoria-detalle-etiqueta";

    etiqueta.textContent =
      etiquetas[clave] ??
      clave.replaceAll("_", " ");

    const contenido = document.createElement("span");
    contenido.className = "auditoria-detalle-valor";
    contenido.textContent = formatearValor(clave, valor);

    fila.appendChild(etiqueta);
    fila.appendChild(contenido);

    contenedor.appendChild(fila);
  });

  return contenedor;
}


function crearBloqueComparacion(titulo, datos) {
  const bloque = document.createElement("div");
  bloque.className = "auditoria-bloque";

  const encabezado = document.createElement("h4");
  encabezado.textContent = titulo;
  bloque.appendChild(encabezado);

  const etiquetas = {
    id: "ID",
    codigo: "Código",
    nombre: "Nombre",
    marca: "Marca",
    modelo: "Modelo",
    numero_serie: "Número de serie",
    estado: "Estado",
    fecha_registro: "Fecha de registro",
    correo: "Correo",
    rol: "Rol",
    tipo: "Tipo"
  };

  Object.entries(datos).forEach(([clave, valor]) => {
    // Evitamos mostrar datos técnicos innecesarios.
    if (clave === "id" || clave === "fecha_registro") {
      return;
    }

    const fila = document.createElement("div");
    fila.className = "auditoria-campo";

    const etiqueta = document.createElement("span");
    etiqueta.textContent =
      etiquetas[clave] ?? clave.replaceAll("_", " ");

    const contenido = document.createElement("strong");
    contenido.textContent =
      valor === null || valor === undefined
        ? "-"
        : typeof valor === "object"
          ? JSON.stringify(valor, null, 2)
          : String(valor);

    fila.appendChild(etiqueta);
    fila.appendChild(contenido);
    bloque.appendChild(fila);
  });

  return bloque;
}
