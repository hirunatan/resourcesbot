import * as TelegramBot from "node-telegram-bot-api";
import {token, command, start_menu, start_groups, menus} from "./config";

const bot = new TelegramBot(token, {polling: true});

console.log("Running and connected to Telegram API.");

bot.onText(command, (msg) => {
  let menu = start_menu;
  if (msg.chat.type === "group" ||
      msg.chat.type === "supergroup") {
    const start_group = start_groups[msg.chat.title];
    if (start_group) {
      menu = start_group;
    }
  }
  sendMenu(msg, menu);
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

