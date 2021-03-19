const express = require('express');
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require('axios');
const TeleBot = require('telebot');
const db = require('./db/db.config');
const UserWithDb = require('./controller/users');
const Helper = require('./controller/helper');
const Auth = require('./middleware/auth');
require('dotenv').config();
const knex = require('knex')({
    client: 'pg',
    connection: {
        user: process.env.USER_NAME,
        host: process.env.HOST,
        database: process.env.DATABASE,
        password: process.env.PASSWORD,
        port: process.env.PORT,
        ssl: false
    }
});


const server = express();
server.use(bodyParser.urlencoded({ extended: false }));
server.use(bodyParser.json());
server.use(express.json());
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

bot.on(/^\d{2}(.)\d{2}\1\d{4}$/, (msg) => {

    let date = new Date(Date.now());

    axios({
        method: 'get',
        url: `https://api.privatbank.ua/p24api/exchange_rates?json&date=${msg.text}`
    })
        .then(async response => {
            let itemUSD = response.data.exchangeRate.filter(item => item.currency === "USD");
            if (itemUSD.length) {
                const rows = await Helper.checkAccount(msg.from.id);

                if (!rows.length) {
                    rows = await Helper.insertAccount(msg);
                }

                const createQuery = `INSERT INTO history (account_id, date, query, response) VALUES ($1, $2, $3, $4) RETURNING *`;
                const values = [
                    rows[0].id,
                    date.toISOString(),
                    msg.text,
                    `SaleRate: ${itemUSD[0].saleRate} UAH PurchaseRate: ${itemUSD[0].purchaseRate} UAH`
                ];

                db.query(createQuery, values)
                    .then(() => {
                        msg.reply.text(`SaleRate: ${itemUSD[0].saleRate} UAH \nPurchaseRate: ${itemUSD[0].purchaseRate} UAH`);
                    })
                    .catch(error => {
                        msg.reply.text(error.message);
                    })
            }
            else {
                msg.reply.text("Not found");
            }
        })
        .catch(error => {
            msg.reply.text(error.message);
        })
});

bot.on('/rates', (msg) => {
    let date = new Date(Date.now());
    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();

    axios({
        method: 'get',
        url: `https://api.privatbank.ua/p24api/exchange_rates?json&date=${day}.${month}.${year}`
    })
        .then(async response => {
            let mas = msg.text.split(' ');
            let itemRates = mas.length > 1 ? mas[1] : 'USD';
            let itemUSD = response.data.exchangeRate.filter(item => item.currency === itemRates);

            if (itemUSD.length) {

                const rows = await Helper.checkAccount(msg.from.id);

                if (!rows.length) {
                    rows = await Helper.insertAccount(msg);
                }
                console.log(rows)

                // console.log(mas)
                // console.log(itemUSD)
                let saleRate = itemUSD[0].saleRate ? itemUSD[0].saleRate : itemUSD[0].saleRateNB;
                let purchaseRate = itemUSD[0].purchaseRate ? itemUSD[0].purchaseRate : itemUSD[0].purchaseRateNB;

                const values = {
                    account_id: rows[0].id,
                    date: date.toISOString(),
                    query: msg.text,
                    response: `SaleRate: ${saleRate} UAH PurchaseRate: ${purchaseRate} UAH`
                };
                console.log(msg)
                knex('history').insert(values)
                    .then(() => {
                        msg.reply.text(`SaleRate: ${saleRate} UAH \nPurchaseRate: ${purchaseRate} UAH`);
                    })
                    .catch(error => {
                        msg.reply.text(error.message);
                    })
            }
            else msg.reply.text("Not found");
        })
        .catch(error => {
            msg.reply.text(error.message);
        })
});

bot.on('/exchange', (msg) => {
    let date = new Date(Date.now());
    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();

    axios({
        method: 'get',
        url: `https://api.privatbank.ua/p24api/exchange_rates?json&date=${day}.${month}.${year}`
    })
        .then(async response => {
            let mas = msg.text.split(' ');
            let carrency = mas[1] !== 'UAH' ? mas[1] : mas[mas.length - 1];

            let itemUSD = response.data.exchangeRate.filter(item => item.currency === carrency);

            if (itemUSD.length) {

                const rows = await Helper.checkAccount(msg.from.id);

                if (!rows.length) {
                    rows = await Helper.insertAccount(msg);
                }

                let saleRate = itemUSD[0].saleRate ? itemUSD[0].saleRate : itemUSD[0].saleRateNB;
                let answer = mas[1] !== 'UAH' ? `${mas[2]} ${mas[1]} = ${Math.ceil((mas[2] * saleRate) * 100) / 100} ${mas[4]}` : `${mas[2]} ${mas[1]} = ${Math.ceil((mas[2] / saleRate) * 100) / 100} ${mas[mas.length - 1]}`

                const values = {
                    account_id: rows[0].id,
                    date: date.toISOString(),
                    query: msg.text,
                    response: answer
                };
                console.log(msg.from.id)
                knex('history').insert(values)
                    .then(() => {
                        msg.reply.text(answer);
                    })
                    .catch(error => {
                        msg.reply.text(error.message);
                    })
            }
            else msg.reply.text("Not found");
        })
        .catch(error => {
            msg.reply.text(error.message);
        })
});

bot.on('/hide', async (msg) => {

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
        'Type /start to show keyboard again.'
    ];

    db.query(createQuery, values)
        .then(() => {
            msg.reply.text('Type /start to show keyboard again.', { replyMarkup: 'hide' });
        })
        .catch(error => {
            msg.reply.text(error.message);
        })

});

bot.on('/hello', async (msg) => {

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
        'Welcome! Enter the date in the format \'dd.mm.yyyy\', \'/rates\' \\ \'/rates CURRENCY\' for the current date or \'/exchange UAH SUMM = CURRENCY\''
    ];

    db.query(createQuery, values)
        .then(() => {
            msg.reply.text('Welcome! Enter the date in the format \'dd.mm.yyyy\', \'/rates\' \\ \'/rates CURRENCY\' for the current date or \'/exchange UAH SUMM = CURRENCY\'');
        })
        .catch(error => {
            msg.reply.text(error.message);
        })

});


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

server.get('/', (req, res) => {

    const createQuery = 'Select history.id, name, query from accounts inner join history on accounts.id=history.account_id ORDER BY history.id ASC';

    db.query(createQuery, null)
        .then(response => {
            res.status(200).send(response);
        })
        .catch(error => {
            res.status(500).send(error);
        })
})

// app.get('/', Auth.verifyToken, (req, res) => {
//     return res.status(200).send({ 'message': 'OK!' });
// });

server.post('/create', UserWithDb.create);
server.post('/login', UserWithDb.login);
server.post('/login/auth', Auth.verifyToken, UserWithDb.login);

server.listen(3001, () => {
    console.log(`App running`)
})

// require('https').createServer().listen(process.env.PORT || 55000).on('request', function (req, res) {
//     res.end('')
// });

bot.start();