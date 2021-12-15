import * as TelegramBot from 'node-telegram-bot-api';
import {
  Message,
  CallbackQuery,
  InlineKeyboardMarkup,
  InlineKeyboardButton,
} from 'telegram-typings';
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
  getUserGroups,
  getGroupMenus,
  menu2Markdown,
  addEntryToMenu,
} from './menus';
import {
  getContext,
  startDialog,
  endDialog,
  setState,
  setValue,
} from './context';

// === Setup =============

const bot = new TelegramBot(token, { polling: true });

export function initTelegram() {
  setupCommands();

  bot.onText(new RegExp('/' + directoryCommand), handleDirectory);
  bot.onText(new RegExp('/' + editCommand), handleEdit);
  bot.onText(/^[^\/]/, handleTextMessage);

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
        type: 'all_private_chats',
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
  chooseGroup(msg, msg.from?.username || '');
}

function handleCallback(query: CallbackQuery) {
  // Respond to a keyboard callback button pressed
  // that has menuId of a submenu to navigate.
  const msg = query.message;
  const { action, data } = JSON.parse(query.data || '');
  switch (action) {
    case 'nav-menu':
      if (msg && data) {
        getMenu(data, (menu: Menu) => {
          replaceMenu(msg, menu);
        });
      }
      break;

    case 'choose-group':
      if (msg) {
        chooseGroup(msg, msg.chat.username || '');
      }
      break;

    case 'choose-menu':
      if (msg && (data !== undefined)) {
        getGroupMenus(data, (menus: Menu[]) => {
          chooseMenu(msg, menus);
        });
      }
      break;

    case 'edit-menu':
      if (msg && data) {
        getMenu(data, (menu: Menu) => {
          editMenu(msg, menu);
        });
      }
      break;

    case 'add-entry':
      if (msg && data) {
        addEntry(msg, data);
      }
      break;

    case 'add-menu-entry':
      if (msg && data) {
        addMenuEntry(msg, data);
      }
      break;

    case 'add-menu-entry-menu':
      if (msg && data) {
        addMenuEntryMenu(msg, data);
      }
      break;

    case 'add-url-entry':
      if (msg && data) {
        addUrlEntry(msg, data);
      }
      break;
  }
}

function handleTextMessage(msg: Message) {
  getContext(msg, (context) => {
    switch (context?.state) {
      case 'add-menu-entry-title':
        addMenuEntryTitle(msg);
        break;

      case 'add-url-entry-title':
        addUrlEntryTitle(msg);
        break;

      case 'add-url-entry-url':
        addUrlEntryUrl(msg);
        break;
    }
  });
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
  return keyboardMarkup(
    menu.entries.map(entry => {
      if (entry.menu) {
        return [
          actionKeyboardButton(entry.text, 'nav-menu', entry.menu),
        ];
      } else if (entry.url) {
        return [urlKeyboardButton(entry.text, entry.url)];
      } else {
        return [];
      }
    })
  );
}

function chooseGroup(msg: Message, username: string) {
  const groups = getUserGroups(username);
  if (!groups || groups.length == 0) {
    bot.sendMessage(
      msg.chat.id,
      'Lo siento, no tienes autorización para editar ningún grupo. ' +
        'Habla con los administradores del bot para que te autoricen.',
    );
  } else if (groups.length == 1) {
    getGroupMenus(groups[0], (menus: Menu[]) => {
      chooseMenu(msg, menus);
    });
  } else {
    bot.sendMessage(msg.chat.id, 'Elige un grupo para editar sus menús:', {
      reply_markup: keyboardMarkup(
        groups.map((group: string) => {
          const groupName = group ? group : 'Menús globales';
          return [
            actionKeyboardButton(groupName, 'choose-menu', group),
          ];
        })
      )
    });
  }
}

function chooseMenu(msg: Message, menus: Menu[]) {
  bot.sendMessage(msg.chat.id, 'Elige qué menú quieres modificar', {
    reply_markup: keyboardMarkup(
      menus.map((menu: Menu) => {
        return [
          actionKeyboardButton(
            menu.title + (menu.isDefault ? ' (*)' : ''),
            'edit-menu',
            menu.id),
        ];
      }).concat([
        [
          actionKeyboardButton('« Volver a grupos', 'choose-group', ''),
        ]
      ])
    )
  });
}

function editMenu(msg: Message, menu: Menu) {
  bot.sendMessage(msg.chat.id, 'Modificación de menu\n' + menu2Markdown(menu), {
    parse_mode: 'MarkdownV2',
    reply_markup: keyboardMarkup([
      [
        actionKeyboardButton('Añadir entrada', 'add-entry', menu.id),
        actionKeyboardButton('Borrar entrada', 'remove-entry', menu.id),
      ],
      [
        actionKeyboardButton('Borrar menu', 'remove-menu', menu.id),
        actionKeyboardButton('« Volver a menús', 'choose-menu', menu.groupTitle),
      ],
    ]),
  });
}

function addEntry(msg: Message, menuId: string) {
  bot
    .sendMessage(
      msg.chat.id,
      'Indica el tipo de entrada que quieres añadir:',
      {
        reply_markup: keyboardMarkup([
          [
            actionKeyboardButton('Ir a otro menú', 'add-menu-entry', menuId),
            actionKeyboardButton('Navegar a url', 'add-url-entry', menuId),
            actionKeyboardButton('Ir al menú global', 'add-global-entry', menuId),
          ],
        ]),
      }
    )
    .then((msg2: Message) => {
      startDialog(msg, 'add-entry');
    });
}

function addMenuEntry(msg: Message, menuId: string) {
  setValue(msg, 'menuId', menuId, () => {
    bot
      .sendMessage(
        msg.chat.id,
        'Ok. Por favor, escribe el título de la nueva entrada.'
      )
      .then((msg2: Message) => {
        setState(msg, 'add-menu-entry-title');
      });
  });
}

function addMenuEntryTitle(msg: Message) {
  setValue(msg, 'entryTitle', msg.text || '', () => {
    getContext(msg, (context) => {
      getMenu(context.menuId, (menu) => {
        getGroupMenus(menu.groupTitle, (menus) => {
          const otherMenus = menus.filter((m) => m.id !== context.menuId);
          if (otherMenus.length === 0) {
            bot
              .sendMessage(
                msg.chat.id,
                'Lo siento, no hay otros menús a los que puedas navegar desde aquí.'
              )
              .then((msg2: Message) => {
                editMenu(msg2, menu);
              });
          } else {
            bot
              .sendMessage(
                msg.chat.id,
                'Muy bien. Ahora escribe el menú al que quieres navegar.', {
                  reply_markup: keyboardMarkup(
                      otherMenus.map((menu: Menu) => {
                        return [
                          actionKeyboardButton(menu.title, 'add-menu-entry-menu', menu.id)
                        ]
                      })
                  )
                })
              .then((msg2: Message) => {
                setState(msg, 'add-menu-entry-menu');
              });
          }
        });
      });
    });
  });
}

function addMenuEntryMenu(msg: Message, menuId: string) {
  setValue(msg, 'entryMenu', menuId, () => {
    getContext(msg, (context) => {
      if (context.menuId && context.entryTitle && context.entryMenu) {
        addEntryToMenu(
          context.menuId,
          {
            text: context.entryTitle, // TODO: validate inputs
            menu: context.entryMenu,
          },
          (err, _, affectedDocument) => {
            if (!err) {
              bot
                .sendMessage(
                  msg.chat.id,
                  'Correcto! Entrada añadida. Puedes seguir modificando el menú.'
                )
                .then((msg2: Message) => {
                  editMenu(msg2, affectedDocument);
                });
            }
          }
        );
      }
    });
  });
}

function addUrlEntry(msg: Message, menuId: string) {
  setValue(msg, 'menuId', menuId, () => {
    bot
      .sendMessage(
        msg.chat.id,
        'Ok. Por favor, escribe el título de la nueva entrada.'
      )
      .then((msg2: Message) => {
        setState(msg, 'add-url-entry-title');
      });
  });
}

function addUrlEntryTitle(msg: Message) {
  setValue(msg, 'entryTitle', msg.text || '', () => {
    bot
      .sendMessage(
        msg.chat.id,
        'Muy bien. Ahora escribe la dirección web a la que quieres ir.'
      )
      .then((msg2: Message) => {
        setState(msg, 'add-url-entry-url');
      });
  });
}

function addUrlEntryUrl(msg: Message) {
  setValue(msg, 'entryUrl', msg.text || '', () => {
    getContext(msg, (context) => {
      if (context.menuId && context.entryTitle && context.entryUrl) {
        addEntryToMenu(
          context.menuId,
          {
            text: context.entryTitle, // TODO: validate inputs
            url: context.entryUrl,
          },
          (err, _, affectedDocument) => {
            if (!err) {
              bot
                .sendMessage(
                  msg.chat.id,
                  'Correcto! Entrada añadida. Puedes seguir modificando el menú.'
                )
                .then((msg2: Message) => {
                  editMenu(msg2, affectedDocument);
                });
            }
          }
        );
      }
    });
  });
}

function keyboardMarkup(
  buttons: InlineKeyboardButton[][]
): InlineKeyboardMarkup {
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

function actionKeyboardButton(
  text: string,
  action: string,
  data: string | null
): InlineKeyboardButton {
  return {
    text: text,
    callback_data: JSON.stringify({
      action: action,
      data: data,
    }),
  };
}
