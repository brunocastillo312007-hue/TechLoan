
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// Generar un código aleatorio de 6 dígitos
function generarCodigoVerificacion() {
  return crypto.randomInt(100000, 1000000).toString();
}

// Convertir el código en un hash seguro
function generarHashCodigo(codigo) {
  return crypto
    .createHash("sha256")
    .update(codigo)
    .digest("hex");
}

// Configuración del servidor de correo
function crearTransportador() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
}

// Enviar el código de verificación
async function enviarCodigoVerificacion(correo, codigo) {

  const transportador = crearTransportador();

  await transportador.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: correo,
    subject: "TechLoan - Verificación de correo",
    text: `Bienvenido a TechLoan.

Tu código de verificación es: ${codigo}

Este código tiene una validez de 10 minutos.

Si no solicitaste esta cuenta, ignora este mensaje.

Equipo TechLoan.`
  });

}


async function enviarCorreoAprobacion(correo, nombre) {
  const transportador = crearTransportador();

  await transportador.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: correo,
    subject: "TechLoan - Cuenta aprobada",
    text: `
Hola ${nombre}:

Tu solicitud de registro en TechLoan ha sido aprobada.

Tu cuenta ya está activa y puedes iniciar sesión
utilizando el correo y la contraseña que registraste.

Bienvenido a TechLoan.

Equipo TechLoan
    `.trim()
  });
}

async function enviarCorreoRechazo(correo, nombre) {
  const transportador = crearTransportador();

  await transportador.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: correo,
    subject: "TechLoan - Solicitud de registro",
    text: `
Hola ${nombre}:

Tu solicitud de registro en TechLoan ha sido revisada.

Lamentamos informarte que tu solicitud no ha sido aprobada.

Si consideras que se trata de un error,
puedes comunicarte con el administrador del sistema.

Equipo TechLoan
    `.trim()
  });
}


module.exports = {
  generarCodigoVerificacion,
  generarHashCodigo,
  enviarCodigoVerificacion,
    enviarCorreoAprobacion,
    enviarCorreoRechazo
};
