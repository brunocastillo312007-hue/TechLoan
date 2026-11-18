
const { Pool } = require("pg");
require("dotenv").config();

const config = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 10000
    }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    };

const pool = new Pool(config);

module.exports = pool;
