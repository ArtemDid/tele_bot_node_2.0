const jwt = require('jsonwebtoken');
const db = require('../db/db.config');
require('dotenv').config();


const Auth = {

    async verifyToken(req, res, next) {
        const token = req.headers['x-access-token'];
        console.log(token);
        if (!token) {
            return res.status(400).send({ 'message': 'Token is not provided', 'success': false });
        }
        try {
            const decoded = await jwt.verify(token, process.env.SECRET);
            console.log([decoded.id]);
            const text = 'SELECT * FROM users WHERE id = $1';
            
            const { rows } = await db.query(text, [decoded.id]);
            if (!rows[0]) {
                return res.status(400).send({ 'message': 'The token you provided is invalid', 'success': false });
            }
            req.user = { id: decoded.id };
            next();
        } catch (error) {
            return res.status(400).send({'message': error, 'success': false });
        }
    }
}

module.exports = Auth;