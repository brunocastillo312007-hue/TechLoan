
/* ==========================================
   TECHLOAN - ACCESIBILIDAD
   ========================================== */

(function () {
  const CLAVE_TEMA = "techloan_tema";

  function aplicarTema(tema) {
    const oscuro = tema === "oscuro";

    document.documentElement.classList.toggle(
      "tema-oscuro",
      oscuro
    );

    localStorage.setItem(
      CLAVE_TEMA,
      oscuro ? "oscuro" : "claro"
    );

    const boton = document.getElementById(
      "btnModoOscuro"
    );

    if (boton) {
      boton.textContent = oscuro
        ? "☀️ Modo claro"
        : "🌙 Modo oscuro";

      boton.setAttribute(
        "aria-pressed",
        String(oscuro)
      );
    }
  }

  function inicializar() {
    const boton = document.getElementById(
      "btnModoOscuro"
    );

    aplicarTema(
      localStorage.getItem(CLAVE_TEMA) === "oscuro"
        ? "oscuro"
        : "claro"
    );

    if (boton) {
      boton.addEventListener("click", () => {
        const oscuro =
          document.documentElement.classList.contains(
            "tema-oscuro"
          );

        aplicarTema(oscuro ? "claro" : "oscuro");
      });
    }


    // TAMAÑO DE LETRA
    const selectorLetra = document.getElementById(
      "selectorTamanoLetra"
    );

    const tamanosPermitidos = [
      "90", "100", "115", "130"
    ];

    const tamanoGuardado =
      localStorage.getItem("techloan_tamano_letra");

    const tamanoInicial =
      tamanosPermitidos.includes(tamanoGuardado)
        ? tamanoGuardado
        : "100";

    function cambiarTamanoLetra(tamano) {
      if (!tamanosPermitidos.includes(tamano)) {
        return;
      }

      document.documentElement.style.fontSize =
        tamano + "%";

      localStorage.setItem(
        "techloan_tamano_letra",
        tamano
      );
    }

    cambiarTamanoLetra(tamanoInicial);

    if (selectorLetra) {
      selectorLetra.value = tamanoInicial;

      selectorLetra.addEventListener(
        "change",
        function () {
          cambiarTamanoLetra(this.value);
        }
      );
    }


    // =====================================
    // LECTOR DE VOZ
    // =====================================

    const btnLeer = document.getElementById(
      "btnLeerPagina"
    );

    const btnDetener = document.getElementById(
      "btnDetenerLectura"
    );

    function leerPagina() {
      if (!("speechSynthesis" in window)) {
        alert(
          "Tu navegador no admite lectura de voz."
        );
        return;
      }

      window.speechSynthesis.cancel();

      const contenido = document.querySelector(
        ".main-content"
        ) || document.querySelector(
        ".portal-contenedor"
        ) || document.querySelector(
        ".login-container"
        ) || document.body;
      const texto = contenido.innerText.trim();

      if (!texto) {
        alert("No hay contenido para leer.");
        return;
      }

      const mensaje = new SpeechSynthesisUtterance(
        texto
      );

      mensaje.lang = "es-ES";
      mensaje.rate = 0.9;
      mensaje.pitch = 1;
      mensaje.volume = 1;

      const voces =
        window.speechSynthesis.getVoices();

      const vozEspanol = voces.find(
        voz => voz.lang.toLowerCase().startsWith("es")
      );

      if (vozEspanol) {
        mensaje.voice = vozEspanol;
        mensaje.lang = vozEspanol.lang;
      }

      window.speechSynthesis.speak(mensaje);
    }

    if (btnLeer) {
      btnLeer.addEventListener(
        "click",
        leerPagina
      );
    }

    if (btnDetener) {
      btnDetener.addEventListener(
        "click",
        () => window.speechSynthesis.cancel()
      );
    }

    window.addEventListener("pagehide", () => {
      window.speechSynthesis.cancel();
    });

  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      inicializar
    );
  } else {
    inicializar();
  }
})();
