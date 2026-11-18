
let administradorActual = null;

if (!sessionStorage.getItem("techloan_token")) {
  window.location.replace("index.html");
} else {
  iniciarUsuarios();
}

async function iniciarUsuarios() {
  try {
    // Verificar permisos en el backend
    await peticionAPI("/usuarios");

    administradorActual = JSON.parse(
      sessionStorage.getItem("techloan_usuario") || "null"
    );

    if (!administradorActual ||
        administradorActual.rol !== "ADMIN") {
      window.location.replace("dashboard.html");
      return;
    }

    document.getElementById("nombreUsuario")
      .textContent = administradorActual.nombre;

    document.getElementById("rolUsuario")
      .textContent = administradorActual.rol;

    document.getElementById("appLayout").hidden = false;

    document.getElementById("cerrarSesion")
      .addEventListener("click", cerrarSesionUsuarios);

    document.getElementById("btnNuevoUsuario")
      .addEventListener("click", abrirModalUsuario);

    document.getElementById("cerrarModalUsuario")
      .addEventListener("click", cerrarModalUsuario);

    document.getElementById("cancelarUsuario")
      .addEventListener("click", cerrarModalUsuario);

    document.getElementById("formUsuario")
      .addEventListener("submit", registrarUsuarioWeb);

    await cargarUsuarios();

  } catch (error) {
    alert("No se pudo acceder al módulo: " + error.message);
    window.location.replace("dashboard.html");
  }
}

async function cargarUsuarios() {
  const tabla = document.getElementById("tablaUsuarios");
  const mensaje = document.getElementById("mensajeUsuarios");

  mensaje.textContent = "";
  tabla.replaceChildren();

  try {
    const datos = await peticionAPI("/usuarios");

    const usuarios = Array.isArray(datos)
      ? datos
      : datos.usuarios;

    document.getElementById("totalUsuarios")
      .textContent = `${usuarios.length} usuarios`;

    if (usuarios.length === 0) {
      const fila = document.createElement("tr");
      const celda = document.createElement("td");

      celda.colSpan = 7;
      celda.textContent = "No hay usuarios registrados.";

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
        usuario.rol,
        usuario.tipo
      ];

      valores.forEach(valor => {
        const celda = document.createElement("td");
        celda.textContent = valor ?? "-";
        fila.appendChild(celda);
      });

      const celdaEstado = document.createElement("td");
      const etiqueta = document.createElement("span");

      etiqueta.className = usuario.activo
        ? "usuario-estado usuario-activo"
        : "usuario-estado usuario-inactivo";

      etiqueta.textContent = usuario.activo
        ? "ACTIVO"
        : "INACTIVO";

      celdaEstado.appendChild(etiqueta);
      fila.appendChild(celdaEstado);

      const celdaAcciones = document.createElement("td");

      
if (Number(usuario.id) === Number(administradorActual.id)) {

  celdaAcciones.textContent = "Sesión actual";

} else if (
  !["ACTIVO", "INACTIVO"].includes(usuario.estado_cuenta)
) {

  // Las cuentas no aprobadas se gestionan
  // desde Solicitudes de registro.
  const etiqueta = document.createElement("span");

  etiqueta.className = "usuario-estado usuario-inactivo";

  switch (usuario.estado_cuenta) {
    case "PENDIENTE_VERIFICACION":
      etiqueta.textContent = "Pendiente de verificación";
      break;

    case "PENDIENTE_APROBACION":
      etiqueta.textContent = "Pendiente de aprobación";
      break;

    case "RECHAZADO":
      etiqueta.textContent = "Cuenta rechazada";
      break;

    default:
      etiqueta.textContent = "Cuenta no habilitada";
  }

  celdaAcciones.appendChild(etiqueta);

} else {

  const boton = document.createElement("button");

  boton.type = "button";

  boton.className = usuario.activo
    ? "btn-desactivar"
    : "btn-activar";

  boton.textContent = usuario.activo
    ? "Desactivar"
    : "Activar";

  boton.addEventListener("click", () => {
    cambiarEstadoUsuarioWeb(usuario);
  });

  celdaAcciones.appendChild(boton);
}


      fila.appendChild(celdaAcciones);
      tabla.appendChild(fila);
    });

  } catch (error) {
    mensaje.textContent =
      "Error al consultar usuarios: " + error.message;
  }
}

function abrirModalUsuario() {
  document.getElementById("formUsuario").reset();

  document.getElementById("errorUsuario")
    .textContent = "";

  document.getElementById("modalUsuario")
    .hidden = false;
}

function cerrarModalUsuario() {
  document.getElementById("modalUsuario").hidden = true;
}

async function registrarUsuarioWeb(evento) {
  evento.preventDefault();

  const error = document.getElementById("errorUsuario");
  const boton = document.getElementById("guardarUsuario");

  error.textContent = "";

  
const usuario = {
  nombre: document.getElementById("usuarioNombre")
    .value.trim(),

  correo: document.getElementById("usuarioCorreo")
    .value.trim(),

  password: document.getElementById("usuarioPassword")
    .value,

  tipo: document.getElementById("usuarioTipo")
    .value,

  rol: document.getElementById("usuarioRol")
    .value
};


  
if (
  !usuario.nombre ||
  !usuario.correo ||
  usuario.password.length < 12 ||
  !usuario.tipo ||
  !usuario.rol
) {
  error.textContent =
    "Completa todos los campos y utiliza una contraseña " +
    "de al menos 12 caracteres.";
  return;
}


const combinacionValida =
  (
    usuario.rol === "USUARIO" &&
    ["ESTUDIANTE", "DOCENTE"].includes(usuario.tipo)
  ) ||
  (
    usuario.rol === "OPERADOR" &&
    usuario.tipo === "RESPONSABLE"
  );

if (!combinacionValida) {
  error.textContent =
    "Los estudiantes y docentes deben tener rol USUARIO. " +
    "Los responsables deben tener rol OPERADOR.";
  return;
}


  boton.disabled = true;
  boton.textContent = "Registrando...";

  try {
    await peticionAPI("/usuarios", {
      method: "POST",
      body: JSON.stringify(usuario)
    });

    cerrarModalUsuario();
    await cargarUsuarios();

    alert("Usuario registrado correctamente.");

  } catch (err) {
    error.textContent = err.message;
  } finally {
    boton.disabled = false;
    boton.textContent = "Registrar usuario";
  }
}

async function cambiarEstadoUsuarioWeb(usuario) {
  const nuevoEstado = !usuario.activo;

  const accion = nuevoEstado ? "activar" : "desactivar";

  const confirmar = confirm(
    `¿Seguro que deseas ${accion} a "${usuario.nombre}"?`
  );

  if (!confirmar) return;

  try {
    await peticionAPI(
      `/usuarios/${usuario.id}/estado`,
      {
        method: "PATCH",
        body: JSON.stringify({
          activo: nuevoEstado
        })
      }
    );

    await cargarUsuarios();

    alert(
      `Usuario ${nuevoEstado ? "activado" : "desactivado"} ` +
      "correctamente."
    );

  } catch (error) {
    alert(
      "No se pudo cambiar el estado: " + error.message
    );
  }
}

function cerrarSesionUsuarios() {
  sessionStorage.removeItem("techloan_token");
  sessionStorage.removeItem("techloan_usuario");
  window.location.replace("index.html");
}
