
const formLogin = document.getElementById("formLogin");
const mensajeError = document.getElementById("mensajeError");
const btnLogin = document.getElementById("btnLogin");

formLogin.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  mensajeError.textContent = "";
  btnLogin.disabled = true;
  btnLogin.textContent = "Ingresando...";

  const correo = document.getElementById("correo").value.trim();
  const password = document.getElementById("password").value;

  try {
    const datos = await peticionAPI("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        correo,
        password
      })
    });

    sessionStorage.setItem("techloan_token", datos.token);
    sessionStorage.setItem(
      "techloan_usuario",
      JSON.stringify(datos.usuario)
    );

    
if (datos.usuario.rol === "USUARIO") {
  window.location.href = "portal-usuario.html";
} else {
  window.location.href = "dashboard.html";
}


  } catch (error) {
    mensajeError.textContent = error.message;
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = "Iniciar sesión";
  }
});
