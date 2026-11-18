const express = require("express");
const router = express.Router();

const incidenciaController = require(
  "../controllers/incidenciaController"
);

const {
  verificarToken,
  permitirRoles
} = require("../middlewares/authMiddleware");

router.use(verificarToken);
router.use(permitirRoles("ADMIN", "OPERADOR"));

router.get("/", incidenciaController.listarIncidencias);

module.exports = router;
