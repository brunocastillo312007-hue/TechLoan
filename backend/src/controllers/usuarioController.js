
const bcrypt = require("bcrypt");

const usuarioRepository = require(
  "../repositories/usuarioRepository"
);
const correoService = require("../services/correoService");

async function listarUsuarios(req, res) {
  try {
    const usuarios =
      await usuarioRepository.obtenerUsuarios();

    res.json(usuarios);

  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      mensaje: "Error al consultar usuarios"
    });
  }
}

async function buscarUsuario(req, res) {
  try {
    const usuario =
      await usuarioRepository.obtenerUsuarioPorId(
        req.params.id
      );

    if (!usuario) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado"
      });
    }

    res.json(usuario);

  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      mensaje: "Error al consultar usuario"
    });
  }
}


async function registrarUsuario(req, res) {
  try {
    const {
      nombre,
      correo,
      password,
      tipo,
      rol
    } = req.body;

    const tiposPermitidos = [
      "ESTUDIANTE",
      "DOCENTE",
      "RESPONSABLE"
    ];

    const rolesPermitidos = [
      "USUARIO",
      "OPERADOR"
    ];

    if (
      typeof nombre !== "string" ||
      !nombre.trim() ||
      typeof correo !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
      typeof password !== "string" ||
      password.length < 12 ||
      !tiposPermitidos.includes(tipo) ||
      !rolesPermitidos.includes(rol)
    ) {
      return res.status(400).json({
        mensaje:
          "Datos inválidos. Verifica nombre, correo, " +
          "tipo, rol y contraseña de mínimo 12 caracteres"
      });
    }

    // Los estudiantes y docentes tendrán rol USUARIO.
    // El personal responsable podrá tener rol OPERADOR.
    const combinacionValida =
      (
        rol === "USUARIO" &&
        ["ESTUDIANTE", "DOCENTE"].includes(tipo)
      ) ||
      (
        rol === "OPERADOR" &&
        tipo === "RESPONSABLE"
      );

    if (!combinacionValida) {
      return res.status(400).json({
        mensaje:
          "Combinación de rol y tipo no permitida. " +
          "ESTUDIANTE y DOCENTE deben ser USUARIO; " +
          "RESPONSABLE debe ser OPERADOR."
      });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const nuevoUsuario =
      await usuarioRepository.crearUsuario(
        {
          nombre: nombre.trim(),
          correo: correo.trim().toLowerCase(),
          password_hash,
          rol,
          tipo
        },
        req.usuario.id
      );

    return res.status(201).json({
      mensaje: "Usuario registrado correctamente",
      usuario: nuevoUsuario
    });

  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        mensaje: "El correo ya está registrado"
      });
    }

    console.error(error);

    return res.status(500).json({
      mensaje: "Error al registrar usuario"
    });
  }
}



async function cambiarEstado(req, res) {
  try {
    const { activo } = req.body;

    // Validar que activo sea booleano
    if (typeof activo !== "boolean") {
      return res.status(400).json({
        mensaje: "El campo activo debe ser verdadero o falso"
      });
    }

    // Impedir que el administrador se desactive a sí mismo
    if (
      Number(req.params.id) === req.usuario.id &&
      !activo
    ) {
      return res.status(409).json({
        mensaje: "No puedes desactivar tu propia cuenta"
      });
    }

    // Actualizar el estado desde el repositorio
    const usuario =
      await usuarioRepository.cambiarEstadoUsuario(
        req.params.id,
        activo,
        req.usuario.id
      );

if (
  usuario?.error === "CUENTA_NO_APROBADA"
) {
  return res.status(409).json({
    mensaje:
      "Esta cuenta no ha sido aprobada. " +
      "Debe gestionarse desde Solicitudes de registro."
  });
}

    // Comprobar que el usuario exista
    if (!usuario) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado"
      });
    }

    // Impedir activar cuentas pendientes o rechazadas
    if (usuario.error === "CUENTA_NO_APROBADA") {
      return res.status(409).json({
        mensaje:
          "Esta cuenta no ha sido aprobada. " +
          "Debe gestionarse desde Solicitudes de registro."
      });
    }

    // Respuesta exitosa
    return res.status(200).json({
      mensaje: "Estado actualizado correctamente",
      usuario
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      mensaje: "Error al actualizar estado"
    });
  }
}



async function listarSolicitantes(req, res) {
  try {
    const usuarios =
      await usuarioRepository.obtenerSolicitantesActivos();

    return res.status(200).json({ usuarios });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      mensaje: "Error al consultar solicitantes"
    });
  }
}


/* ==========================================
   LISTAR CUENTAS PENDIENTES
   ========================================== */

async function listarCuentasPendientes(req, res) {
  try {
    const usuarios =
      await usuarioRepository.obtenerUsuariosPendientes();

    return res.status(200).json({
      usuarios
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      mensaje: "Error al consultar cuentas pendientes"
    });
  }
}


/* ==========================================
   APROBAR O RECHAZAR CUENTA
   ========================================== */


async function resolverCuenta(req, res) {
  try {
    const { decision } = req.body;
    const usuarioId = Number(req.params.id);

    if (
      !Number.isSafeInteger(usuarioId) ||
      usuarioId <= 0 ||
      !["APROBAR", "RECHAZAR"].includes(decision)
    ) {
      return res.status(400).json({
        mensaje: "Identificador o decisión inválida"
      });
    }

    const resultado =
      await usuarioRepository.resolverSolicitudCuenta(
        usuarioId,
        req.usuario.id,
        decision
      );

    if (resultado.estado === "NO_ENCONTRADO") {
      return res.status(404).json({
        mensaje: "Usuario no encontrado"
      });
    }

    if (resultado.estado === "NO_PENDIENTE") {
      return res.status(409).json({
        mensaje: "La cuenta no está pendiente de aprobación"
      });
    }

    // La decisión ya quedó guardada en PostgreSQL.
    // Si el correo falla, no revertimos la aprobación.
    let correoEnviado = true;

    try {
      if (decision === "APROBAR") {
        await correoService.enviarCorreoAprobacion(
          resultado.usuario.correo,
          resultado.usuario.nombre
        );
      } else {
        await correoService.enviarCorreoRechazo(
          resultado.usuario.correo,
          resultado.usuario.nombre
        );
      }
    } catch (errorCorreo) {
      correoEnviado = false;

      console.error(
        "No se pudo enviar la notificación:",
        errorCorreo
      );
    }

    return res.status(200).json({
      mensaje:
        decision === "APROBAR"
          ? "Cuenta aprobada correctamente"
          : "Cuenta rechazada correctamente",
      usuario: resultado.usuario,
      correoEnviado
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      mensaje: "Error al procesar la solicitud"
    });
  }
}



module.exports = {
  listarUsuarios,
  buscarUsuario,
  registrarUsuario,
  cambiarEstado,
  listarSolicitantes,
  listarCuentasPendientes,
  resolverCuenta
};

