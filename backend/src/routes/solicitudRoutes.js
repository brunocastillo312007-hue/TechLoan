
const express = require("express");
const router = express.Router();

const solicitudController = require("../controllers/solicitudController");

const {
  verificarToken,
  permitirRoles
} = require("../middlewares/authMiddleware");

router.use(verificarToken);

// Rutas del usuario
router.get(
  "/mis-solicitudes",
  permitirRoles("USUARIO"),
  solicitudController.listarMisSolicitudes
);

router.post(
  "/",
  permitirRoles("USUARIO"),
  solicitudController.crearSolicitud
);

router.patch(
  "/:id/cancelar",
  permitirRoles("USUARIO"),
  solicitudController.cancelarSolicitud
);

// Rutas administrativas
router.get(
  "/pendientes",
  permitirRoles("ADMIN", "OPERADOR"),
  solicitudController.listarPendientes
);

router.patch(
  "/:id/aprobar",
  permitirRoles("ADMIN", "OPERADOR"),
  solicitudController.aprobarSolicitud
);

router.patch(
  "/:id/rechazar",
  permitirRoles("ADMIN", "OPERADOR"),
  solicitudController.rechazarSolicitud
);

module.exports = router;
