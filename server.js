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
server.post('/create', UserWithDb.create);
server.post('/login', UserWithDb.login);
server.post('/rates', UserWithDb.rates);
server.post('/part/history', UserWithDb.partHistory);
server.post('/payment', UserWithDb.payment);

server.get('/rates/today', UserWithDb.ratesToday);

server.post('/login/auth', Auth.verifyToken, UserWithDb.login);

server.listen(3001, () => {
    console.log(`App running`);
})


bot.start();