
const express = require("express");
const router = express.Router();

const authController = require(
  "../controllers/authController"
);

router.post("/login", authController.login);

router.post("/registro", authController.registroPublico);

router.post("/verificar-correo", authController.verificarCorreo);


module.exports = router;
