const formVerificacion =
  document.getElementById("formVerificacion");

const codigoVerificacion =
  document.getElementById("codigoVerificacion");

const mensajeVerificacion =
  document.getElementById("mensajeVerificacion");

const btnVerificar =
  document.getElementById("btnVerificar");

const correoDestino =
  document.getElementById("correoDestino");

const correo =
  sessionStorage.getItem("techloan_correo_verificacion");

// Comprobar que existe un correo pendiente
if (!correo) {
  correoDestino.textContent =
    "No hay un correo pendiente de verificación.";

  formVerificacion.hidden = true;
} else {
  correoDestino.textContent = correo;
}

// Permitir únicamente números
codigoVerificacion.addEventListener("input", () => {
  codigoVerificacion.value =
    codigoVerificacion.value.replace(/\D/g, "").slice(0, 6);
});

// Procesar la verificación
formVerificacion.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  mensajeVerificacion.textContent = "";

  const codigo = codigoVerificacion.value.trim();

  if (!/^\d{6}$/.test(codigo)) {
    mensajeVerificacion.textContent =
      "Ingresa un código válido de seis dígitos.";
    return;
  }

  if (!correo) {
    mensajeVerificacion.textContent =
      "No se encontró el correo registrado.";
    return;
  }

  btnVerificar.disabled = true;
  btnVerificar.textContent = "Verificando...";

  try {

    await peticionAPI("/auth/verificar-correo", {
      method: "POST",
      body: JSON.stringify({
        correo,
        codigo
      })
    });

    sessionStorage.removeItem(
      "techloan_correo_verificacion"
    );

    formVerificacion.hidden = true;

    mensajeVerificacion.textContent =
      "Correo verificado correctamente. " +
      "Tu cuenta está pendiente de aprobación " +
      "por el administrador. " +
      "Podrás iniciar sesión cuando sea aprobada.";

    mensajeVerificacion.classList.add(
      "mensaje-verificacion-exito"
    );

  } catch (error) {

    mensajeVerificacion.textContent = error.message;

  } finally {

    btnVerificar.disabled = false;
    btnVerificar.textContent = "Verificar correo";

  }
});
