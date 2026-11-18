
require("dotenv").config();

const correoService = require("./src/services/correoService");

async function probarEnvio() {
  try {

    const codigo =
      correoService.generarCodigoVerificacion();

    await correoService.enviarCodigoVerificacion(
      process.env.SMTP_USER,
      codigo
    );

    console.log("Correo enviado correctamente");

  } catch (error) {

    console.error(
      "Error al enviar correo:",
      error.message
    );

  }
}

probarEnvio();
