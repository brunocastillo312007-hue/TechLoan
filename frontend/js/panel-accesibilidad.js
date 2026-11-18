
(function () {
  const contenedor = document.getElementById(
    "panelAccesibilidad"
  );

  if (!contenedor) return;

  contenedor.innerHTML = `
    <button
      type="button"
      id="btnAbrirAccesibilidad"
      class="accesibilidad-flotante"
      aria-label="Abrir opciones de accesibilidad"
      aria-expanded="false"
      aria-controls="accesibilidadOpciones"
    >
      ♿
    </button>

    <section
      id="accesibilidadOpciones"
      class="accesibilidad-panel"
      aria-label="Opciones de accesibilidad"
      hidden
    >
      <div class="accesibilidad-encabezado">
        <h2>Accesibilidad</h2>

        <button
          type="button"
          id="btnCerrarAccesibilidad"
          aria-label="Cerrar panel de accesibilidad"
        >
          ✕
        </button>
      </div>

      <button
        type="button"
        id="btnModoOscuro"
        aria-pressed="false"
      >
        🌙 Modo oscuro
      </button>

      <div class="control-accesibilidad">
        <label for="selectorTamanoLetra">
          Tamaño de letra
        </label>

        <select id="selectorTamanoLetra">
          <option value="90">Pequeña</option>
          <option value="100">Normal</option>
          <option value="115">Grande</option>
          <option value="130">Extra grande</option>
        </select>
      </div>

      <div class="controles-voz">
        <button
          type="button"
          id="btnLeerPagina"
        >
          🔊 Leer página
        </button>

        <button
          type="button"
          id="btnDetenerLectura"
        >
          ⏹ Detener
        </button>
      </div>
    </section>
  `;

  const abrir = document.getElementById(
    "btnAbrirAccesibilidad"
  );

  const cerrar = document.getElementById(
    "btnCerrarAccesibilidad"
  );

  const panel = document.getElementById(
    "accesibilidadOpciones"
  );

  function cambiarPanel(abierto) {
    panel.hidden = !abierto;
    abrir.setAttribute(
      "aria-expanded",
      String(abierto)
    );

    if (abierto) {
      cerrar.focus();
    } else {
      abrir.focus();
    }
  }

  abrir.addEventListener("click", () => {
    cambiarPanel(panel.hidden);
  });

  cerrar.addEventListener("click", () => {
    cambiarPanel(false);
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && !panel.hidden) {
      cambiarPanel(false);
    }
  });
})();
