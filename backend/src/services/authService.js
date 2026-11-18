
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const usuarioRepository = require(
  "../repositories/usuarioRepository"
);

async function iniciarSesion(correo, password) {
  const usuario = await usuarioRepository.buscarPorCorreo(correo);

  if (
  !usuario ||
  !usuario.activo ||
  usuario.correo_verificado !== true ||
  usuario.estado_cuenta !== "ACTIVO"
  ) {
    throw new Error("Credenciales incorrectas");
  }

  const passwordValida = await bcrypt.compare(
    password,
    usuario.password_hash
  );

  if (!passwordValida) {
    throw new Error("Credenciales incorrectas");
  }

  
const token = jwt.sign(
  {
    id: usuario.id,
    rol: usuario.rol,
    version_sesion: usuario.version_sesion
  },
  process.env.JWT_SECRET,
  {
    algorithm: "HS256",
    expiresIn: "2h"
  }
);


  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      tipo: usuario.tipo
    }
  };
}


/* ==========================================
   REGISTRO PÚBLICO DE USUARIOS
   ========================================== */

const correoService = require("./correoService");

async function registrarCuentaPublica(datos) {

  const {
    nombre,
    correo,
    password,
    tipo
  } = datos;

  // Validar tipo de usuario
  if (!["ESTUDIANTE", "DOCENTE"].includes(tipo)) {
    throw new Error("Tipo de usuario no permitido");
  }

  // Verificar si el correo ya existe
  const usuarioExistente =
    await usuarioRepository.buscarPorCorreo(correo);

  if (usuarioExistente) {
    throw new Error("El correo ya está registrado");
  }

  // Cifrar contraseña
  const password_hash = await bcrypt.hash(password, 12);

  // Generar código de verificación
  const codigo =
    correoService.generarCodigoVerificacion();

  const codigoHash =
    correoService.generarHashCodigo(codigo);

  // Crear usuario pendiente
  const nuevoUsuario =
    await usuarioRepository.crearUsuarioPublico({
      nombre,
      correo,
      password_hash,
      tipo
    });

  // Guardar código en PostgreSQL
  await usuarioRepository.guardarCodigoVerificacion(
    nuevoUsuario.id,
    codigoHash
  );

  // Enviar correo electrónico
  await correoService.enviarCodigoVerificacion(
    correo,
    codigo
  );

  return {
    id: nuevoUsuario.id,
    correo: nuevoUsuario.correo,
    estado_cuenta: nuevoUsuario.estado_cuenta
  };
}


async function verificarCorreo(correo, codigo) {

  const codigoHash =
    correoService.generarHashCodigo(codigo);

  return await usuarioRepository.verificarCodigoCorreo(
    correo.trim().toLowerCase(),
    codigoHash
  );

}

module.exports = { iniciarSesion, registrarCuentaPublica, verificarCorreo };
