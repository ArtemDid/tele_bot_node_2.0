const express = require('express');
const bodyParser = require("body-parser");
const cors = require("cors");
const TeleBot = require('telebot');
const db = require('./db/db.config');
const UserWithDb = require('./controller/users');
const Helper = require('./controller/helper');
const UserWithTelebot = require('./controller/usersWithTelebot');
const Auth = require('./middleware/auth');
require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');

const server = express();
server.use(bodyParser.urlencoded({ extended: false }));
server.use(bodyParser.json());
server.use(express.json());
server.use(express.static("public"));
server.use(express.json({ limit: "50mb" }));
server.use(cors());

server.post("/fs", (req, res) => {
    // console.log(req.body);
    // const randomString = crypto.randomBytes(5).toString('hex');
    // const stream = fs.createWriteStream(`./images/${randomString}.png`);

    // stream.on('finish', function () {
    //     console.log('file has been written');
    //     res.status(200).send({ 'message': 'file has been written', 'success': true });
    // });

    // stream.write(Buffer.from(req.body.mas), 'utf-8');
    // stream.end();

    // 
    fs.readFile('./images/37f3786343.png', function (err, data) {
        var contentType = 'image/png';
        var base64 = Buffer.from(data).toString('base64');
        base64='data:image/png;base64,'+base64;
        res.send(base64);
    }); 
});

const BUTTONS = {
    hello: {
        label: '👋 Hello',
        command: '/hello'
    },
    world: {
        label: '🌍 Now Date Rates UAH/USD',
        command: '/rates'
    },
    hide: {
        label: '⌨️ Hide keyboard',
        command: '/hide'
    }
};

const bot = new TeleBot({
    token: process.env.TELEGRAM_BOT_TOKEN,
    usePlugins: ['namedButtons'],
    pluginConfig: {
        namedButtons: {
            buttons: BUTTONS
        }
    }
});

bot.on(/^\d{2}(.)\d{2}\1\d{4}$/, UserWithTelebot.dateInput);
bot.on('/rates', UserWithTelebot.rates);
bot.on('/exchange', UserWithTelebot.exchange);
bot.on('/hide', UserWithTelebot.hide);
bot.on('/hello', UserWithTelebot.hello);
bot.on('/start', async (msg) => {

    let date = new Date(Date.now());

    const rows = await Helper.checkAccount(msg.from.id);

    if (!rows.length) {
        rows = await Helper.insertAccount(msg);
    }

    const createQuery = `INSERT INTO history (account_id, date, query, response) VALUES ($1, $2, $3, $4) RETURNING *`;
    const values = [
        rows[0].id,
        date.toISOString(),
        msg.text,
        `See keyboard below.`
    ];

    db.query(createQuery, values)
        .then(() => {
            console.log('kkk')
            let replyMarkup = bot.keyboard([
                [BUTTONS.hello.label, BUTTONS.world.command],
                [BUTTONS.hide.label]
            ], { resize: true });

            return bot.sendMessage(msg.chat.id, 'See keyboard below.', { replyMarkup });

        })
        .catch(error => {
            msg.reply.text(error.message);
        })

});

server.get('/', UserWithDb.listHistory);
server.post('/', Auth.verifyToken, UserWithDb.listHistory);
server.get('/users', UserWithDb.listUsers);
server.post('/create',
    async function create(req, res) {
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
                let randomString = null;
                if (req.body.mas.length) {
                    randomString = crypto.randomBytes(5).toString('hex');
                    const stream = await fs.createWriteStream(`./images/${randomString}.png`);

                    stream.on('finish', function () {
                        console.log('file has been written');

                    });

                    stream.write(Buffer.from(req.body.mas), 'utf-8');
                    stream.end();
                }

                const createQuery = `INSERT INTO users(login, password, path) VALUES($1, $2, $3) returning *`;
                const values = [
                    req.body.email,
                    hashPassword,
                    randomString ? `./images/${randomString}.png` : null
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
);
server.post('/login', UserWithDb.login);
server.post('/rates', UserWithDb.rates);
server.get('/rates/today', UserWithDb.ratesToday);

server.post('/login/auth', Auth.verifyToken, UserWithDb.login);

server.listen(3001, () => {
    console.log(`App running`);
})

// require('https').createServer().listen(process.env.PORT || 55000).on('request', function (req, res) {
//     res.end('')
// });

bot.start();