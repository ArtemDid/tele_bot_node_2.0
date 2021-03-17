require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.USER_NAME,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: process.env.PORT,
    ssl: false
});

pool.on('connect', () => {
    console.log('Connected to the DB');
});

module.exports = {

    query(text, params){
      return new Promise((resolve, reject) => {
        pool.query(text, params)
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        })
      })
    }
  }