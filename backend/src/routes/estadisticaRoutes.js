
const express = require("express");
const router = express.Router();

const estadisticaController = require(
  "../controllers/estadisticaController"
);

const {
  verificarToken,
  permitirRoles
} = require("../middlewares/authMiddleware");

router.use(verificarToken);

router.get(
  "/",
  permitirRoles("ADMIN", "OPERADOR"),
  estadisticaController.mostrarEstadisticas
);

module.exports = router;
