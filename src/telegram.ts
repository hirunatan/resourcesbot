import * as TelegramBot from "node-telegram-bot-api";
import {token, directoryCommand} from "./config";
import {Menu, MenuEntry, getStartMenu, getMenu} from "./menus";

// See https://github.com/yagop/node-telegram-bot-api/blob/release/doc/api.md
const bot = new TelegramBot(token, {polling: true});

export function initTelegram() {
  bot.onText(directoryCommand, (msg) => {
    // Respond to /directory command
    const groupTitle = getGroupTitle(msg);
    const menu = getStartMenu(groupTitle);
    sendMenu(msg, menu);
  });

  bot.on("callback_query", (query) => {
    // Respond to a keyboard callback button pressed
    // that has menuId of a submenu to navigate
    const msg = query.message;
    const menuId = query.data;
    editMenu(msg, menuId);
  });
}

function getGroupTitle(msg) {
  if (msg.chat.type === "group" ||
      msg.chat.type === "supergroup") {
    return msg.chat.title;
  } else {
    return null;
  }
}

function sendMenu(msg, menu: Menu) {
  const keyboard = menu2keyboard(menu);
  bot.sendMessage(
    msg.chat.id,
    menu.title,
    {
      reply_markup: {
        inline_keyboard: keyboard,
      }
    }
  );
}

function editMenu(msg, menuId: string) {
  const menu = getMenu(menuId);
  const keyboard = menu2keyboard(menu);
  bot.editMessageText(
    menu.title,
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

function menu2keyboard(menu: Menu) {
  // A keyboard is a list of keys, grouped in rows,
  // that may be a link or a callback action.
  return menu.entries.map(entry2keyRow);
}

function entry2keyRow(entry: MenuEntry) {
  const keyRow = [
    {
      text: entry.text,
    }
  ];

  if (entry.menu) {
    keyRow[0]["callback_data"] = entry.menu;
  }

  if (entry.url) {
    keyRow[0]["url"] = entry.url;
  }

  return keyRow;
}
