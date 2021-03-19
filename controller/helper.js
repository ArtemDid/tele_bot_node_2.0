const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const db = require('../db/db.config');

require('dotenv').config();


const Helper = {

  hashPassword(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8))
  },

  comparePassword(hashPassword, password) {
    return bcrypt.compareSync(password, hashPassword);
  },

  isValidEmail(email) {
    return validator.isEmail(email);
  },

  isValidPasswords(password) {
    let reg = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{6,}/;

    return reg.test(password);
  },

  generateToken(id) {
    const token = jwt.sign(
      { id: id },
      process.env.SECRET,
      { expiresIn: '7d' }
    );
    return token;
  },

  async checkUser(email) {
    const createQuery = 'SELECT * FROM users WHERE login = $1';

    const { rows } = await db.query(createQuery, [email]);

    return rows.length;
  },

  async checkAccount(external_id) {
    const createQuery = 'SELECT * FROM accounts WHERE external_id = $1';

    const { rows } = await db.query(createQuery, [external_id]);

    return rows;
  },

  async insertAccount(msg) {
    const createQuery = `INSERT INTO accounts(name, provider, external_id) VALUES($1, $2, $3) returning *`;
    const values = [
      msg.from.first_name,
      msg.entities[0].type === 'bot_command' ? 'telegram' : null,
      msg.from.id
    ];

    const { rows } = await db.query(createQuery, values);

    return rows;
  }
}

module.exports = Helper;