const db = require('../db/db.config');
const Helper = require('./helper');
const axios = require('axios');
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)


function byField(field) {
    return (a, b) => a[field] > b[field] ? 1 : -1;
}


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

            try {
                // let base64 = null;
                // if (req.body.mas.length) {
                //     base64 = Buffer.from(req.body.mas).toString('base64');
                //     base64 = 'data:image/png;base64,' + base64;
                //     console.log(base64)
                // }

                const createQuery = `INSERT INTO users(login, password, path) VALUES($1, $2, $3) returning *`;
                const values = [
                    req.body.email,
                    hashPassword,
                    req.body.mas
                ];

                const { rows } = await db.query(createQuery, values);
                console.log(rows[0].id);
                const token = Helper.generateToken(rows[0].id);
                console.log(token);

                res.status(201).send({ token, 'success': true });
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
        let createQuery = 'Select history.id, name, query from accounts inner join history on accounts.id=history.account_id ORDER BY history.id ASC LIMIT 5 OFFSET 0;';
        db.query(createQuery, null)
            .then(response => {
                let rows = response.rows;
                createQuery = 'Select COUNT(history.id) from accounts inner join history on accounts.id=history.account_id;';
                db.query(createQuery, null)
                    .then(response => {
                        let count = response.rows;
                        res.status(200).send({ rows, count, 'success': true });
                    })
                    .catch(error => {
                        res.status(500).send({ 'message': error, 'success': false });
                    })
            })
            .catch(error => {
                res.status(500).send({ 'message': error, 'success': false });
            })
    },

    partHistory(req, res) {
        console.log(req.body)
        const createQuery = 'Select history.id, name, query from accounts inner join history on accounts.id=history.account_id ORDER BY history.id ASC LIMIT $1 OFFSET $2;';
        db.query(createQuery, [req.body.LIMIT, req.body.OFFSET])
            .then(response => {
                let rows = response.rows;
                console.log(rows)
                res.status(200).send({ rows, 'success': true });
            })
            .catch(error => {
                res.status(500).send({ 'message': error, 'success': false });
            })
    },

    listUsers(req, res) {
        const createQuery = 'SELECT * FROM public.users';

        db.query(createQuery, null)
            .then(response => {
                res.status(200).send({ response, 'success': true });
            })
            .catch(error => {
                res.status(500).send({ 'message': error, 'success': false });
            })
    },

    async payment(req, res) {
        const { id, amount, email, phone } = req.body
        console.log(req.body)
        try {
            const payment = await stripe.paymentIntents.create({
                payment_method: id,
                amount,
                currency: "USD",
                description: `Order from ${email} - ${phone}`,
                confirm: true,
            })
            res.status(200).json({ status: payment.status })
        } catch (e) {
            res.status(400).send(e.message)
        }

    },

    rates(req, res) {
        let date = new Date(Date.now());
        let month = date.getMonth() + 1;
        let year = date.getFullYear();
        let mas = [];
        let mas2 = [];
        let mas3 = [];
        let i = 0;
        const createQuery = 'SELECT jan, feb, mar, apr, may, june, july, aug, sep, oct, nov, "dec" FROM rates where rate=$1 and now_month=$2 and now_year=$3';

        db.query(createQuery, [req.body.rate, month, year])
            .then(async response => {
                let rows = response.rows;
                if (rows.length > 0) {
                    console.log(rows[0])

                    for (key in rows[0]) {
                        mas.push({ month: Object.keys(rows[0])[i], saleRate: rows[0][key] })
                        i++;
                    }
                    i = 0;
                    for (key in rows[1]) {
                        mas[i].purchaseRate = rows[1][key];
                        i++;
                    }
                    console.log(mas)
                    return res.status(201).send({ mas, 'success': true });
                }
                else {
                    while (true) {
                        await axios({
                            method: 'get',
                            url: `https://api.privatbank.ua/p24api/exchange_rates?json&date=01.${month}.${year}`
                        })
                            .then(async response => {

                                let itemUSD = response.data.exchangeRate.filter(item => item.currency === req.body.rate);

                                if (itemUSD.length) {

                                    let saleRate = itemUSD[0].saleRate ? itemUSD[0].saleRate : itemUSD[0].saleRateNB;
                                    let purchaseRate = itemUSD[0].purchaseRate ? itemUSD[0].purchaseRate : itemUSD[0].purchaseRateNB;

                                    mas.push({ month, saleRate, purchaseRate })


                                    console.log(mas)

                                    if (month > 1) {
                                        month--;
                                    }
                                    else {
                                        year--;
                                        month = 12;
                                    }
                                    if (i === 11) {
                                        let date = new Date(Date.now());
                                        let month = date.getMonth() + 1;
                                        let year = date.getFullYear();

                                        mas.sort(byField('month'));
                                        console.log(mas);
                                        mas.forEach(element => {
                                            mas2.push(element.saleRate)
                                            mas3.push(element.purchaseRate);
                                        });
                                        mas2.push(req.body.rate)
                                        mas3.push(req.body.rate);
                                        mas2.push(month)
                                        mas3.push(month);
                                        mas2.push(year)
                                        mas3.push(year);

                                        const createQuerySelectDrop = 'SELECT * FROM rates where rate=$1 and now_month != $2';
                                        const createQueryDrop = 'DELETE FROM rates WHERE id=$1; ';

                                        try {
                                            const { rows } = await db.query(createQuerySelectDrop, [req.body.rate, month]);
                                            if (rows[0]) {
                                                await db.query(createQueryDrop, [rows[0].id]);
                                                await db.query(createQueryDrop, [rows[1].id]);
                                            }
                                        } catch (error) {
                                            return res.status(400).send({ 'message': error, 'success': false });
                                        }

                                        const createQueryInsert = `INSERT INTO public.rates(jan, feb, mar, apr, may, june, july, aug, sep, oct, nov, "dec", rate, now_month, now_year)
                                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning *`;

                                        try {
                                            const { rows } = await db.query(createQueryInsert, mas2);
                                            if (!rows[0]) {
                                                return res.status(500).send({ 'message': error, 'success': false });
                                            }
                                            else {
                                                const { rows } = await db.query(createQueryInsert, mas3);
                                                if (!rows[0]) {
                                                    return res.status(500).send({ 'message': error, 'success': false });
                                                }
                                                else {
                                                    const { rows } = await db.query(createQuery, [req.body.rate, month, year]);
                                                    if (!rows[0]) {
                                                        return res.status(500).send({ 'message': error, 'success': false });
                                                    }

                                                    if (rows.length > 0) {
                                                        console.log(rows[0])
                                                        let mas = [];

                                                        i = 0;
                                                        for (key in rows[0]) {
                                                            mas.push({ month: Object.keys(rows[0])[i], saleRate: rows[0][key] })
                                                            i++;
                                                        }
                                                        i = 0;
                                                        for (key in rows[1]) {
                                                            mas[i].purchaseRate = rows[1][key];
                                                            i++;
                                                        }
                                                        i = 11;
                                                        console.log(mas)
                                                        return res.status(201).send({ mas, 'success': true });
                                                    }
                                                }

                                            }
                                        } catch (error) {
                                            return res.status(400).send({ 'message': error, 'success': false });
                                        }
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
                }
            })
            .catch(error => {
                console.log(error)
                res.status(500).send({ 'message': error, 'success': false });
            })


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