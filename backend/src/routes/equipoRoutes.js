
const express = require("express");
const router = express.Router();

const equipoController = require("../controllers/equipoController");

const {
  verificarToken,
  permitirRoles
} = require("../middlewares/authMiddleware");

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Acceso para los tres roles
router.get(
  "/disponibilidad",
  permitirRoles("ADMIN", "OPERADOR", "USUARIO"),
  equipoController.consultarDisponibilidad
);

// Rutas administrativas
router.use(permitirRoles("ADMIN", "OPERADOR"));
// ADMIN y OPERADOR pueden consultar equipos
router.get(
  "/",
  permitirRoles("ADMIN", "OPERADOR"),
  equipoController.listarEquipos
);

router.get(
  "/:id",
  permitirRoles("ADMIN", "OPERADOR"),
  equipoController.buscarEquipo
);

// Solo ADMIN puede registrar, editar y eliminar
router.post(
  "/",
  permitirRoles("ADMIN"),
  equipoController.registrarEquipo
);

router.put(
  "/:id",
  permitirRoles("ADMIN"),
  equipoController.editarEquipo
);

router.delete(
  "/:id",
  permitirRoles("ADMIN"),
  equipoController.borrarEquipo
);

router.get(
  "/:id/historial",
  permitirRoles("ADMIN", "OPERADOR"),
  equipoController.historialEquipo
);

router.patch(
  "/:id/recuperar",
  verificarToken,
  permitirRoles("ADMIN"),
  equipoController.marcarEquipoReparado
);

module.exports = router;
