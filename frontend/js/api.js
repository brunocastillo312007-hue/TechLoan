
/* ==========================================
   TECHLOAN - CONFIGURACIÓN DE API
   ========================================== */

// Detectar si estamos trabajando localmente
const ES_LOCAL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

// Dirección del backend
const API_URL = ES_LOCAL
  ? "http://localhost:3000/api"
  : `${window.location.origin}/api`;

/* ==========================================
   PETICIONES AL SERVIDOR
   ========================================== */

async function peticionAPI(ruta, opciones = {}) {
  const token = sessionStorage.getItem("techloan_token");

  const headers = {
    "Content-Type": "application/json",
    ...opciones.headers
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const respuesta = await fetch(
    `${API_URL}${ruta}`,
    {
      ...opciones,
      headers
    }
  );

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(
      datos.mensaje || "Error en la petición"
    );
  }

  return datos;
}
