const db = require('../db/db.config');
const Helper = require('./helper');

const User = {
    async create(req, res) {
        console.log(req.body);

        if (!req.body.email || !req.body.password) {
            return res.status(400).send({ 'message': 'Some values are missing', 'success': false });
        }
        if (req.body.email.trim().length === 0 || req.body.password.trim().length === 0) {
            return res.status(400).send({ 'message': 'Some values are empty', 'success': false });
        }
        if (!Helper.isValidEmail(req.body.email)) {
            return res.status(400).send({ 'message': 'Please enter a valid email address', 'success': false });
        }

        if (!await Helper.checkUser(req.body.email)) {

            const hashPassword = Helper.hashPassword(req.body.password);

            console.log(hashPassword);

            const createQuery = `INSERT INTO users(login, password) VALUES($1, $2) returning *`;
            const values = [
                req.body.email,
                hashPassword
            ];

            try {
                const { rows } = await db.query(createQuery, values);
                console.log(rows[0].id);
                const token = Helper.generateToken(rows[0].id);
                console.log(token);
                return res.status(201).send({ token, 'success': true  });
            } catch (error) {
                console.log("eee", error);
                if (error.routine === '_bt_check_unique') {
                    return res.status(400).send({ 'message': 'User with that EMAIL already exist', 'success': false })
                }
                return res.status(400).send({ 'message': error, 'success': false });
            }
        }
        else return res.status(400).send({ 'message': 'A user with this login already exists.', 'success': false });
    },

    async login(req, res) {
        if (!req.body.email || !req.body.password) {
            return res.status(400).send({ 'message': 'Some values are missing', 'success': false });
        }
        if (req.body.email.trim().length === 0 || req.body.password.trim().length === 0) {
            return res.status(400).send({ 'message': 'Some values are empty', 'success': false });
        }
        if (!Helper.isValidEmail(req.body.email)) {
            return res.status(400).send({ 'message': 'Please enter a valid email address', 'success': false });
        }
        const createQuery = 'SELECT * FROM users WHERE login = $1';
        try {
            const { rows } = await db.query(createQuery, [req.body.email]);
            if (!rows[0]) {
                return res.status(400).send({ 'message': 'The credentials you provided is incorrect', 'success': false });
            }
            if (!Helper.comparePassword(rows[0].password, req.body.password)) {
                return res.status(400).send({ 'message': 'The credentials you provided is incorrect', 'success': false });
            }
            const token = Helper.generateToken(rows[0].id);
            return res.status(200).send({ token, 'success': true  });
        } catch (error) {
            return res.status(400).send({'message': error, 'success': false});
        }
    }


}

module.exports = User;