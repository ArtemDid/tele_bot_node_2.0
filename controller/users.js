const db = require('../db/db.config');
const Helper = require('./helper');
const axios = require('axios');


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
        if (!Helper.isValidPasswords(req.body.password)) {
            return res.status(400).send({ 'message': 'Password must contain lowercase, uppercase letters and numbers', 'success': false });
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
                return res.status(201).send({ token, 'success': true });
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
        console.log(req.body)
        if (!req.body.email || !req.body.password) {
            return res.status(400).send({ 'message': 'Some values are missing', 'success': false });
        }
        if (req.body.email.trim().length === 0 || req.body.password.trim().length === 0) {
            return res.status(400).send({ 'message': 'Some values are empty', 'success': false });
        }
        if (!Helper.isValidEmail(req.body.email)) {
            return res.status(400).send({ 'message': 'Please enter a valid email address', 'success': false });
        }
        if (!Helper.isValidPasswords(req.body.password)) {
            return res.status(400).send({ 'message': 'Password must contain lowercase, uppercase letters and numbers', 'success': false });
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
            return res.status(200).send({ token, 'success': true });
        } catch (error) {
            return res.status(400).send({ 'message': error, 'success': false });
        }
    },

    listHistory(req, res) {
        const createQuery = 'Select history.id, name, query from accounts inner join history on accounts.id=history.account_id ORDER BY history.id ASC';

        db.query(createQuery, null)
            .then(response => {
                res.status(200).send(response.rows);
            })
            .catch(error => {
                res.status(500).send(error);
            })
    },

    listUsers(req, res) {
        const createQuery = 'SELECT id, login FROM public.users';

        db.query(createQuery, null)
            .then(response => {
                res.status(200).send(response);
            })
            .catch(error => {
                res.status(500).send(error);
            })
    },

    async rates(req, res) {
        let date = new Date(Date.now());
        let month = date.getMonth() + 1;
        let year = date.getFullYear();
        let mas = [];
        let i = 0;
        while (true) {
            await axios({
                method: 'get',
                url: `https://api.privatbank.ua/p24api/exchange_rates?json&date=01.${month}.${year}`
            })
                .then(response => {

                    let itemUSD = response.data.exchangeRate.filter(item => item.currency === req.body.rate);

                    if (itemUSD.length) {

                        let saleRate = itemUSD[0].saleRate ? itemUSD[0].saleRate : itemUSD[0].saleRateNB;
                        let purchaseRate = itemUSD[0].purchaseRate ? itemUSD[0].purchaseRate : itemUSD[0].purchaseRateNB;

                        mas.push({ saleRate, purchaseRate, month })

                        console.log(mas)

                        if (month > 1) {
                            month--;
                        }
                        else {
                            year--;
                            month = 12;
                        }
                        if (i === 11) {
                            return res.status(201).send({ mas, 'success': true });
                        }
                        else {
                            i++;
                        }

                    }
                    else return res.status(400).send({ 'message': 'Not found', 'success': false });

                })
                .catch(error => {
                    return res.status(400).send({ 'message': error, 'success': false });
                })
        }
    },

    ratesToday(req, res) {
        let date = new Date(Date.now());
        let day = date.getDate();
        let month = date.getMonth() + 1;
        let year = date.getFullYear();

        axios({
            method: 'get',
            url: `https://api.privatbank.ua/p24api/exchange_rates?json&date=${day}.${month}.${year}`
        })
            .then(response => {

                let itemUSD = response.data.exchangeRate;

                if (itemUSD.length) {
                    return res.status(201).send({ itemUSD, 'success': true });
                }
                else return res.status(400).send({ 'message': 'Not found', 'success': false });

            })
            .catch(error => {
                return res.status(400).send({ 'message': error, 'success': false });
            })

    },



}

module.exports = User;