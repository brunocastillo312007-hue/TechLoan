const equipoRoutes = require("./src/routes/equipoRoutes");
const express = require("express");
const cors = require("cors");
const authRoutes = require("./src/routes/authRoutes");
const usuarioRoutes = require("./src/routes/usuarioRoutes");
const prestamoRoutes = require("./src/routes/prestamoRoutes");
const auditoriaRoutes = require("./src/routes/auditoriaRoutes");
const estadisticaRoutes = require("./src/routes/estadisticaRoutes");
const solicitudRoutes = require("./src/routes/solicitudRoutes");
const incidenciaRoutes = require(
  "./src/routes/incidenciaRoutes"
);
require("dotenv").config();

const pool = require("./src/config/database");

const app = express();

const path = require("path");

app.use(cors());
app.use(express.json());

// Ruta de los archivos del frontend
const frontendPath = path.join(__dirname, "../frontend");

// Servir HTML, CSS y JavaScript
app.use(express.static(frontendPath));

app.use("/api/equipos", equipoRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/prestamos", prestamoRoutes);
app.use("/api/auditoria", auditoriaRoutes);
app.use("/api/estadisticas", estadisticaRoutes);
app.use("/api/incidencias", incidenciaRoutes);
app.use("/api/solicitudes", solicitudRoutes);

app.get("/api", (req, res) => {
  res.json({
    mensaje: "Bienvenido a la API de TechLoan"
  });
});

app.get("/api/test-db", async (req, res) => {
  try {
    const resultado = await pool.query(
      "SELECT NOW() AS fecha"
    );

    res.json({
      mensaje: "Conexión exitosa a PostgreSQL",
      fecha: resultado.rows[0].fecha
    });
  } catch (error) {
    console.error("Error de conexión:", error.message);

    res.status(500).json({
      mensaje: "No se pudo conectar a la base de datos"
    });
  }
});


const PORT = process.env.PORT || 3000;

// Iniciar el servidor cuando se ejecuta localmente
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(
      `Servidor TechLoan ejecutándose en puerto ${PORT}`
    );
  });
}

// Exportar la aplicación Express para Vercel
module.exports = app;

