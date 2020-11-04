import * as TelegramBot from "node-telegram-bot-api";
import {token, command, start_menu, menus} from "./config";

const bot = new TelegramBot(token, {polling: true});

bot.onText(command, (msg) => {
  sendMenu(msg, start_menu);
});

bot.on("callback_query", (query) => {
  const msg = query.message;
  const data = query.data;
  editMenu(msg, data);
});

function sendMenu(msg, key: string) {
  const menu = menus[key];
  const keyboard = menu.options.map(entry2keyboard);
  bot.sendMessage(
    msg.chat.id,
    menu.name,
    {
      reply_markup: {
        inline_keyboard: keyboard,
      }
    }
  );
}

function editMenu(msg, key: string) {
  const menu = menus[key];
  const keyboard = menu.options.map(entry2keyboard);
  bot.editMessageText(
    menu.name,
    {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
    }
  ).then((msg2) => {
    bot.editMessageReplyMarkup(
      {
        inline_keyboard: keyboard,
      },
      {
        chat_id: msg2.chat.id,
        message_id: msg2.message_id,
      }
    );
  });
}

function entry2keyboard(entry: Array<string | null>) {
  const keyboard = [
    {
      text: entry[0],
    }
  ];

  if (entry[1]) {
    keyboard[0]["callback_data"] = entry[1];
  }

  if (entry[2]) {
    keyboard[0]["url"] = entry[2];
  }

  return keyboard;
}

