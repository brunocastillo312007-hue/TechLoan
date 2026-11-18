
const express = require("express");
const router = express.Router();

const prestamoController = require(
  "../controllers/prestamoController"
);

const {
  verificarToken,
  permitirRoles
} = require("../middlewares/authMiddleware");


router.use(verificarToken);


router.get(
  "/mis-prestamos",
  permitirRoles("ADMIN", "OPERADOR", "USUARIO"),
  prestamoController.listarMisPrestamos
);


router.get(
  "/",
  permitirRoles("ADMIN", "OPERADOR"),
  prestamoController.listarPrestamos
);

router.post(
  "/",
  permitirRoles("ADMIN", "OPERADOR"),
  prestamoController.crearPrestamo
);

router.patch(
  "/:id/devolucion",
  permitirRoles("ADMIN", "OPERADOR"),
  prestamoController.devolverEquipo
);

router.get(
  "/reportes/vencidos",
  permitirRoles("ADMIN", "OPERADOR"),
  prestamoController.listarPrestamosVencidos
);

router.get(
  "/alertas/devolucion",
  permitirRoles("ADMIN", "OPERADOR"),
  prestamoController.listarAlertasDevolucion
);
module.exports = router;
