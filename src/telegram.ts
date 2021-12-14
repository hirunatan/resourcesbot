import * as TelegramBot from 'node-telegram-bot-api';
import { Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton } from 'telegram-typings';
import {
  token,
  directoryCommand,
  directoryCommandDesc,
  editCommand,
  editCommandDesc,
} from './config';
import {
  Menu,
  getDefaultMenu,
  getMenu,
  getAllMenus,
  menu2Markdown,
  addEntryToMenu
} from './menus';

// === Setup =============

const bot = new TelegramBot(token, { polling: true });

export function initTelegram() {
  setupCommands();

  bot.onText(new RegExp('/' + directoryCommand), handleDirectory);
  bot.onText(new RegExp('/' + editCommand), handleEdit);

  bot.on('callback_query', handleCallback);
}

function setupCommands() {
  bot.setMyCommands(
    [
      {
        command: directoryCommand,
        description: directoryCommandDesc,
      },
    ],
    {
      scope: JSON.stringify({
        type: 'default',
      }),
    }
  );

  bot.setMyCommands(
    [
      {
        command: directoryCommand,
        description: directoryCommandDesc,
      },
      {
        command: editCommand,
        description: editCommandDesc,
      },
    ],
    {
      scope: JSON.stringify({
        type: 'all_chat_administrators',
      }),
    }
  );
}

// === Command handlers =============

function handleDirectory(msg: Message) {
  const groupTitle = getGroupTitle(msg);
  getDefaultMenu(groupTitle, (menu: Menu) => {
    sendMenu(msg, menu);
  });
}

function handleEdit(msg: Message) {
  bot.getChatMember(msg.chat?.id, msg.from?.id).then(member => {
    if (member.status === 'creator' || member.status === 'administrator') {
      const groupTitle = getGroupTitle(msg);
      getAllMenus(groupTitle, (menus: Menu[]) => {
        chooseMenu(msg, menus);
      });
    } else {
      bot.sendMessage(msg.chat.id, 'Hay que ser administrador para hacer esto.');
    }
  });
}

function handleCallback(query: CallbackQuery) {
  // Respond to a keyboard callback button pressed
  // that has menuId of a submenu to navigate.
  const msg = query.message;
  const { action, args } = JSON.parse(query.data || '');
  switch (action) {
    case 'nav-menu':
      if (msg && args.menuId) {
        getMenu(args.menuId, (menu: Menu) => {
          replaceMenu(msg, menu);
        });
      }
      break;

    case 'edit-menu':
      if (msg && args.menuId) {
        getMenu(args.menuId, (menu: Menu) => {
          editMenu(msg, menu);
        });
      }
      break;

    case 'add-entry':
      if (msg && args.menuId) {
        addEntry(msg, args.menuId);
      }
      break;

    case 'add-entry-url':
      if (msg && args.menuId) {
        addEntryUrl(msg, args.menuId);
      }
      break;
  }
}

// === Utility functions =============

function getGroupTitle(msg: Message): string | null {
  if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
    return msg.chat.title || '';
  } else {
    return null;
  }
}

function sendMenu(msg: Message, menu: Menu) {
  // Send a new message containing a keyboard with all
  // entries of the menu.
  bot.sendMessage(msg.chat.id, menu.title, {
    reply_markup: menu2Keyboard(menu),
  });
}

function replaceMenu(msg: Message, menu: Menu) {
  // Edit the message with a new keyboard with the given menu.
  bot
  .editMessageText(menu.title, {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
  })
  .then((msg2: Message) => {
    bot.editMessageReplyMarkup(menu2Keyboard(menu), {
      chat_id: msg2.chat.id,
      message_id: msg2.message_id,
    });
  });
}

function menu2Keyboard(menu: Menu): InlineKeyboardMarkup {
  // A keyboard is a list of keys, grouped in rows,
  // that may be a link or a callback action.
  return keyboardMarkup(menu.entries.map(entry => {
    if (entry.menu) {
      return [
        actionKeyboardButton(entry.text,
                             'nav-menu',
                             { menuId: entry.menu }),
      ];
    } else if (entry.url) {
      return [
        urlKeyboardButton(entry.text, entry.url),
      ];
    } else {
      return [];
    }
  }));
}

function chooseMenu(msg: Message, menus: Menu[]) {
  bot.sendMessage(
    msg.chat.id,
    'Elige qué menú quieres modificar',
    {
      reply_markup: keyboardMarkup(
        menus.map(menu => {
          return [
            actionKeyboardButton(menu.title, 'edit-menu', { menuId: menu.id }),
          ];
        })
      ),
    }
  );
}

function editMenu(msg: Message, menu: Menu) {
  bot.sendMessage(
    msg.chat.id,
    'Modificación de menu\n' + menu2Markdown(menu),
    {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboardMarkup([
        [
          actionKeyboardButton('Añadir entrada', 'add-entry', { menuId: menu.id }),
          actionKeyboardButton('Borrar entrada', 'remove-entry', { menuId: menu.id }),
        ],
        [
          actionKeyboardButton('Borrar menu', 'remove-menu', { menuId: menu.id }),
          actionKeyboardButton('« Volver atrás', 'choose-menu', {}),
        ]
      ]),
    },
  );
}


function addEntry(msg: Message, menuId: string) {
  bot.sendMessage(
    msg.chat.id,
    'Indica el tipo de entrada que quieres añadir:'+menuId,
    {
      reply_markup: keyboardMarkup([
        [
          actionKeyboardButton('Ir a otro menú', 'add-entry-menu', { menuId: menuId }),
          actionKeyboardButton('Navegar a url', 'add-entry-url', { menuId: menuId }),
          actionKeyboardButton('Ir al menú global', 'add-entry-glob', { menuId: menuId }),
        ]
      ])
    }
  );
}


function addEntryUrl(msg: Message, menuId: string) {
  bot
  .sendMessage(
    msg.chat.id,
    'Ok. Por favor, responde a este mensaje con el título de la nueva entrada.'
  )
  .then((msg2: Message) => {
    bot.onReplyToMessage(
      msg2.chat.id,
      msg2.message_id,

      (reply1: Message) => {
        bot
        .sendMessage(
          reply1.chat.id,
          'Muy bien. Ahora responde a este mensaje indicando la dirección web a la que quieres ir.'
        )

        .then((msg3: Message) => {
          bot.onReplyToMessage(
            msg3.chat.id,
            msg3.message_id,

            (reply2: Message) => {
              addEntryToMenu(menuId, {
                text: reply1.text || '',  // TODO: validate inputs
                url: reply2.text || '',
              },
              (err, _, affectedDocument) => {
                if (!err) {
                  bot
                  .sendMessage(
                    reply2.chat.id,
                    'Correcto! Entrada añadida. Puedes seguir modificando el menú.'
                  )

                  .then((msg4: Message) => {
                    editMenu(msg4, affectedDocument);
                  });
                }
              });
            }
          );
        });
      }
    );
  });
}

function keyboardMarkup(buttons: InlineKeyboardButton[][]): InlineKeyboardMarkup {
  return {
    inline_keyboard: buttons,
  };
}

function urlKeyboardButton(text: string, url: string): InlineKeyboardButton {
  return {
    text: text,
    url: url,
  };
}

function actionKeyboardButton(text: string, action: string, args: object): InlineKeyboardButton {
  return {
    text: text,
    callback_data: JSON.stringify({
      action: action,
      args: args,
    }),
  };
}
