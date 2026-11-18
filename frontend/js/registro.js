
const formRegistro = document.getElementById("formRegistro");
const mensajeRegistro = document.getElementById("mensajeRegistro");
const btnRegistro = document.getElementById("btnRegistro");

formRegistro.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  mensajeRegistro.textContent = "";

  const nombre =
    document.getElementById("nombreRegistro").value.trim();

  const correo =
    document.getElementById("correoRegistro")
      .value.trim().toLowerCase();

  const tipo =
    document.getElementById("tipoRegistro").value;

  const password =
    document.getElementById("passwordRegistro").value;

  const confirmarPassword =
    document.getElementById("confirmarPassword").value;

  if (password !== confirmarPassword) {
    mensajeRegistro.textContent =
      "Las contraseñas no coinciden";
    return;
  }

  if (password.length < 12) {
    mensajeRegistro.textContent =
      "La contraseña debe tener mínimo 12 caracteres";
    return;
  }

  btnRegistro.disabled = true;
  btnRegistro.textContent = "Registrando...";

  try {

    await peticionAPI("/auth/registro", {
      method: "POST",
      body: JSON.stringify({
        nombre,
        correo,
        password,
        tipo
      })
    });

    // Conservar el correo para la pantalla de verificación
    sessionStorage.setItem(
      "techloan_correo_verificacion",
      correo
    );

    window.location.href = "verificar-correo.html";

  } catch (error) {

    mensajeRegistro.textContent = error.message;

  } finally {

    btnRegistro.disabled = false;
    btnRegistro.textContent = "Crear cuenta";

  }
});
