
const express = require("express");
const router = express.Router();

const auditoriaController = require(
  "../controllers/auditoriaController"
);

const {
  verificarToken,
  permitirRoles
} = require("../middlewares/authMiddleware");

router.use(verificarToken);
router.use(permitirRoles("ADMIN"));

router.get("/", auditoriaController.listarAuditoria);

module.exports = router;
