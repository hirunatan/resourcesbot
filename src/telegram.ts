import * as TelegramBot from "node-telegram-bot-api";
import {Message, CallbackQuery, InlineKeyboardButton} from "telegram-typings";
import {token, directoryCommand, directoryCommandDesc, editCommand, editCommandDesc} from "./config";
import {Menu, MenuEntry, getDefaultMenu, getMenu} from "./menus";


// === Setup =============

const bot = new TelegramBot(token, {polling: true});

export function initTelegram() {
  setupCommands();

  bot.onText(new RegExp("/" + directoryCommand), handleDirectory);
  bot.onText(new RegExp("/" + editCommand), handleEdit);

  bot.on("callback_query", handleQuery);
}

function setupCommands() {
  bot.setMyCommands([
    {
      command: directoryCommand,
      description: directoryCommandDesc
    }
  ],
  {
    scope: JSON.stringify({
      type: "default",
    })
  });

  bot.setMyCommands([
    {
      command: directoryCommand,
      description: directoryCommandDesc
    },
    {
      command: editCommand,
      description: editCommandDesc
    }
  ],
  {
    scope: JSON.stringify({
      type: "all_chat_administrators",
    })
  });
}


// === Command handlers =============

function handleDirectory(msg: Message) {
  const groupTitle = getGroupTitle(msg);
  getDefaultMenu(groupTitle, (menu: Menu) => {
    sendMenu(msg, menu);
  });
}

function handleEdit(msg: Message) {
  bot.sendMessage(
    msg.chat.id,
    "hola"
  );
}

function handleQuery(query: CallbackQuery) {
  // Respond to a keyboard callback button pressed
  // that has menuId of a submenu to navigate.
  const msg = query.message;
  const menuId = query.data || "";
  if (msg) {
    editMenu(msg, menuId);
  }
}


// === Utility functions =============

function getGroupTitle(msg: Message): string | null {
  if (msg.chat.type === "group" ||
      msg.chat.type === "supergroup") {
    return msg.chat.title || "";
  } else {
    return null;
  }
}

function sendMenu(msg: Message, menu: Menu) {
  // Send a new message containing a keyboard with all
  // entries of the menu.
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

function editMenu(msg: Message, menuId: string) {
  // Edit the message with a new keyboard with
  // the given menu.
  getMenu(menuId, (menu: Menu) => {
    const keyboard = menu2keyboard(menu);
    bot.editMessageText(
      menu.title,
      {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
      }
    ).then((msg2: Message) => {
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
  });
}

function menu2keyboard(menu: Menu): InlineKeyboardButton[][] {
  // A keyboard is a list of keys, grouped in rows,
  // that may be a link or a callback action.
  return menu.entries.map(entry2keyRow);
}

function entry2keyRow(entry: MenuEntry): InlineKeyboardButton[] {
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
