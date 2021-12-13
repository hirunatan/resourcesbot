# ResourcesBot

Telegram Bot to make a browseable directory of the online resources of an
organization.

**Features**:

 - Static list of links to web pages, social networks, telegram groups, etc.
 - Grouped in hierarchical menus.
 - Add a `/directory` command for interactively browsing the catalog.
 - Ability to define different menus for each Telegram group.

## Usage

First, register a new bot with **@BotFather** [as explained
here](https://core.telegram.org/bots#6-botfather).

 - You only are required to set the bot name and description, and recommended
   a bot profile picture. Take note of the assigned token.

 - Perhaps you want to register a bot for private use while configuring it
   and a public one for real use. You can delete the private one after
   finishing.

Clone this repo and install dependencies with

```
npm install
```

Copy the `/src/config.ts.example` to `src/config.ts` and modify it as you wish.
You need to enter at least the token you got in the first step.

Run the bot with

```
npm start
```

If everything is ok, you will see a message saying the app is running, and you
should be able to use the bot by connecting to the address that @Botfather
gave you (https://t.me/your_bot).

## Deploy

To deploy the bot to a production server, first change the bot key in config.ts
file, if necessary. Then compile it withhttps://pm2.keymetrics.io/hthttps://pm2.keymetrics.io/tps://pm2.keymetrics.io/

```
npm run build
```

And copy the contents of the `dist/` directory to the server. You can run it with

```
npm install node-telegram-bot-api
node index.js
```

But we recommend to use [pm2](https://pm2.keymetrics.io). Install it as explained
in the documentation and then execute this in the bots directory:

```
pm2 start --name your_bot index.js
pm2 startup systemd
 (copy and paste the sudo command, to install pm2 as a global service)
pm2 save
 (to registar the bot to be restarted when it fails)
```

There are some useful commands to monitorize the bot state:

```
pm2 list
pm2 monit
pm2 logs --lines 100
```

## Documentation

### Official telegram bots api documentation

* https://core.telegram.org/bots

* https://core.telegram.org/bots/api

### Tutorials to create Telegram bots

* https://github.com/hosein2398/node-telegram-bot-api-tutorial

* https://tecnonucleous.com/creacion-de-bots-de-telegram-en-nodejs

### Node Telegram Bot API client reference

* https://www.npmjs.com/package/node-telegram-bot-api

* https://github.com/yagop/node-telegram-bot-api/blob/release/doc/api.md

### PM2 tool

To manage a production setup of a nodejs app.

* https://pm2.keymetrics.io/

### Tsdx

To generate the app skeleton.

* https://tsdx.io/

### NP

To publish node packages

* https://github.com/sindresorhus/np

