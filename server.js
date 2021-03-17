const express = require('express');
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require('axios');
const TeleBot = require('telebot');
const db = require('./db/db.config');
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
server.use(cors());


const BUTTONS = {
    hello: {
        label: '👋 Hello',
        command: '/hello'
    },
    world: {
        label: '🌍 Now Date',
        command: '/now'
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
        .then(response => {
            let itemUSD = response.data.exchangeRate.filter(item => item.currency === "USD");
            if (itemUSD.length) {
                const createQuery = `INSERT INTO history_users (query, user_name, user_id, date, answer) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
                const values = [
                    msg.text,
                    msg.from.first_name,
                    msg.from.id,
                    date.toISOString(),
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

bot.on('/now', (msg) => {
    let date = new Date(Date.now());
    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();

    axios({
        method: 'get',
        url: `https://api.privatbank.ua/p24api/exchange_rates?json&date=${day}.${month}.${year}`
    })
        .then(response => {
            let itemUSD = response.data.exchangeRate.filter(item => item.currency === "USD");

            if (itemUSD.length) {

                const values = {
                    query: msg.text,
                    user_name: msg.from.first_name,
                    user_id: msg.from.id,
                    date: date.toISOString(),
                    answer: `SaleRate: ${itemUSD[0].saleRate} UAH PurchaseRate: ${itemUSD[0].purchaseRate} UAH`
                };
                console.log(msg.from.id)
                knex('history_users').insert(values)
                    .then(() => {
                        msg.reply.text(`SaleRate: ${itemUSD[0].saleRate} UAH \nPurchaseRate: ${itemUSD[0].purchaseRate} UAH`);
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

bot.on('/hide', (msg) => {

    let date = new Date(Date.now());

    const createQuery = `INSERT INTO history_users (query, user_name, user_id, date, answer) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const values = [
        msg.text,
        msg.from.first_name,
        msg.from.id,
        date.toISOString(),
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

bot.on('/hello', (msg) => {

    let date = new Date(Date.now());

    const createQuery = `INSERT INTO history_users (query, user_name, user_id, date, answer) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const values = [
        msg.text,
        msg.from.first_name,
        msg.from.id,
        date.toISOString(),
        'Welcome! Enter the date in the format \'dd.mm.yyyy\' or \'/now\' for the current date'
    ];

    db.query(createQuery, values)
        .then(() => {
            msg.reply.text('Welcome! \nEnter the date in the format \'dd.mm.yyyy\'\nor \'/now\' for the current date');
        })
        .catch(error => {
            msg.reply.text(error.message);
        })

});


bot.on('/start', (msg) => {

    let date = new Date(Date.now());

    console.log(date.toISOString());

    const createQuery = `INSERT INTO history_users (query, user_name, user_id, date, answer) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const values = [
        msg.text,
        msg.from.first_name,
        msg.from.id,
        date.toISOString(),
        `See keyboard below.`
    ];
    db.query(createQuery, values)
        .then(() => {
            console.log('kkk')
            let replyMarkup = bot.keyboard([
                [BUTTONS.hello.label, BUTTONS.world.label],
                [BUTTONS.hide.label]
            ], { resize: true });

            return bot.sendMessage(msg.chat.id, 'See keyboard below.', { replyMarkup });

        })
        .catch(error => {
            msg.reply.text(error.message);
        })

});

server.get('/', (req, res) => {

    const createQuery = 'SELECT * FROM public.history_users ORDER BY "id" ASC';
    const values = null;

    db.query(createQuery, values)
        .then(response => {
            res.status(200).send(response);
        })
        .catch(error => {
            res.status(500).send(error);
        })
})

server.listen(55000, () => {
    console.log(`App running`)
})

// require('https').createServer().listen(process.env.PORT || 55000).on('request', function (req, res) {
//     res.end('')
// });

bot.start();