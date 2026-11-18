
const express = require("express");
const router = express.Router();

const usuarioController = require(
  "../controllers/usuarioController"
);

const {
  verificarToken,
  permitirRoles
} = require("../middlewares/authMiddleware");

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Ruta para administradores y operadores
router.get(
  "/solicitantes",
  permitirRoles("ADMIN", "OPERADOR"),
  usuarioController.listarSolicitantes
);

// Las siguientes rutas son exclusivas de ADMIN
router.use(permitirRoles("ADMIN"));

// Consultar cuentas pendientes
router.get(
  "/pendientes",
  usuarioController.listarCuentasPendientes
);

// Aprobar o rechazar una cuenta
router.patch(
  "/:id/aprobacion",
  usuarioController.resolverCuenta
);

// Funcionalidades administrativas existentes
router.get("/", usuarioController.listarUsuarios);

router.get("/:id", usuarioController.buscarUsuario);

router.post("/", usuarioController.registrarUsuario);

router.patch(
  "/:id/estado",
  usuarioController.cambiarEstado
);

module.exports = router;
