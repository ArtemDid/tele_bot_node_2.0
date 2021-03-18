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
    const createQueryS = 'SELECT * FROM users WHERE login = $1';

    const { rows } = await db.query(createQueryS, [email]);

    console.log(rows.length)

    return rows.length;
  }
}

module.exports = Helper;