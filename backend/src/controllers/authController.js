
const authService = require("../services/authService");

async function login(req, res) {
  try {
    const { correo, password } = req.body;

    if (
      typeof correo !== "string" ||
      !correo.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        mensaje: "Correo y contraseña son obligatorios"
      });
    }

    const resultado = await authService.iniciarSesion(
      correo,
      password
    );

    res.status(200).json({
      mensaje: "Inicio de sesión exitoso",
      ...resultado
    });

  } catch (error) {
    if (error.message === "Credenciales incorrectas") {
      return res.status(401).json({
        mensaje: "Correo o contraseña incorrectos"
      });
    }

    console.error(error.message);

    res.status(500).json({
      mensaje: "Error interno al iniciar sesión"
    });
  }
}


/* ==========================================
   REGISTRO PÚBLICO
   ========================================== */

async function registroPublico(req, res) {

  try {

    const {
      nombre,
      correo,
      password,
      tipo
    } = req.body;

    // Validaciones
    if (
      typeof nombre !== "string" ||
      !nombre.trim() ||
      typeof correo !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
      typeof password !== "string" ||
      password.length < 12 ||
      !["ESTUDIANTE", "DOCENTE"].includes(tipo)
    ) {
      return res.status(400).json({
        mensaje:
          "Datos inválidos. Verifica nombre, correo, " +
          "tipo y contraseña de mínimo 12 caracteres"
      });
    }

    const resultado =
      await authService.registrarCuentaPublica({
        nombre: nombre.trim(),
        correo: correo.trim().toLowerCase(),
        password,
        tipo
      });

    return res.status(201).json({
      mensaje:
        "Cuenta creada. Revisa tu correo para verificarla.",
      usuario: resultado
    });

  } catch (error) {

    if (
      error.message === "El correo ya está registrado" ||
      error.code === "23505"
    ) {
      return res.status(409).json({
        mensaje: "El correo ya está registrado"
      });
    }

    console.error(error);

    return res.status(500).json({
      mensaje: "Error al registrar la cuenta"
    });

  }

}


async function verificarCorreo(req, res) {

  try {

    const { correo, codigo } = req.body;

    if (
      typeof correo !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
      typeof codigo !== "string" ||
      !/^\d{6}$/.test(codigo)
    ) {
      return res.status(400).json({
        mensaje: "Correo o código inválido"
      });
    }

    const resultado = await authService.verificarCorreo(
      correo,
      codigo
    );

    if (resultado.estado === "VERIFICADO") {
      return res.status(200).json({
        mensaje:
          "Correo verificado correctamente. " +
          "Tu cuenta está pendiente de aprobación."
      });
    }

    if (resultado.estado === "YA_VERIFICADO") {
      return res.status(409).json({
        mensaje: "Este correo ya fue verificado"
      });
    }

    if (resultado.estado === "EXPIRADO") {
      return res.status(400).json({
        mensaje: "El código ha expirado"
      });
    }

    if (resultado.estado === "BLOQUEADO") {
      return res.status(429).json({
        mensaje: "Demasiados intentos de verificación"
      });
    }

    return res.status(400).json({
      mensaje: "Código de verificación incorrecto"
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      mensaje: "Error al verificar el correo"
    });

  }

}

module.exports = { login, registroPublico, verificarCorreo };
