
require("dotenv").config();

const bcrypt = require("bcrypt");
const pool = require("../src/config/database");
const readline = require("node:readline/promises");

async function crearAdmin() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    const nombre = (await rl.question(
      "Nombre del administrador: "
    )).trim();

    const correo = (await rl.question(
      "Correo del administrador: "
    )).trim().toLowerCase();

    const password = await rl.question(
      "Contraseña (mínimo 12 caracteres): "
    );

    if (!nombre || !correo.includes("@") ||
        password.length < 12) {
      throw new Error("Datos inválidos o contraseña muy corta");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO usuarios
       (nombre, correo, password_hash, rol, tipo)
       VALUES ($1, $2, $3, 'ADMIN', 'RESPONSABLE')`,
      [nombre, correo, passwordHash]
    );

    console.log("Administrador creado correctamente");

  } catch (error) {
    if (error.code === "23505") {
      console.error("El correo ya está registrado");
    } else {
      console.error(error.message);
    }
  } finally {
    rl.close();
    await pool.end();
  }
}

crearAdmin();
