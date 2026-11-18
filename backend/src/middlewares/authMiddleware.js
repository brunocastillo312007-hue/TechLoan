
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

// Verificar token y estado actual de la cuenta
async function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      mensaje: "Acceso denegado. Token requerido"
    });
  }

  const token = authHeader.split(" ")[1];

  let decoded;

  try {
    decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: ["HS256"] }
    );
  } catch (error) {
    return res.status(401).json({
      mensaje: "Token inválido o expirado"
    });
  }

  try {
    
const resultado = await pool.query(
  `SELECT
     id,
     nombre,
     correo,
     rol,
     activo,
     correo_verificado,
     estado_cuenta,
     version_sesion
   FROM usuarios
   WHERE id = $1`,
  [decoded.id]
);


    if (resultado.rows.length === 0) {
      return res.status(401).json({
        mensaje: "Usuario no encontrado"
      });
    }

    const usuario = resultado.rows[0];


console.log("===== DEPURACIÓN DE SESIÓN =====");
console.log("ID del token:", decoded.id);
console.log("Versión JWT:", decoded.version_sesion);
console.log("Versión PostgreSQL:", usuario.version_sesion);
console.log("Estado de cuenta:", usuario.estado_cuenta);


    if (
      !usuario.activo ||
      !usuario.correo_verificado ||
      usuario.estado_cuenta !== "ACTIVO"
    ) {
      return res.status(401).json({
        mensaje:
          "Tu cuenta no está habilitada para acceder. " +
          "Verifica su estado con el administrador."
      });
    }


if (
  !Number.isInteger(decoded.version_sesion) ||
  decoded.version_sesion !== usuario.version_sesion
) {
  return res.status(401).json({
    mensaje:
      "Tu sesión ya no es válida. " +
      "Debes iniciar sesión nuevamente."
  });
}

    // Utilizar el rol actual de PostgreSQL
    req.usuario = {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol
    };

    next();

  } catch (error) {
    console.error("Error en verificarToken:", error);

    return res.status(500).json({
      mensaje: "Error al verificar el usuario"
    });
  }
}

// Controlar permisos según el rol
function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        mensaje: "Debes iniciar sesión"
      });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        mensaje: "No tienes permisos para esta operación"
      });
    }

    next();
  };
}

module.exports = {
  verificarToken,
  permitirRoles
};
