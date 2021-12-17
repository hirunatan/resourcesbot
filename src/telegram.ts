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
  MenuEntry,
  getDefaultMenu,
  getMenu,
  getUserGroups,
  getGroupMenus,
  menu2Html,
  menu2Markdown,
  addNewMenu,
  changeMenuTitle,
  removeWholeMenu,
  addEntryToMenu,
  removeEntryFromMenu,
  moveEntryInMenu,
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
  const menu = getDefaultMenu(groupTitle);
  sendMenu(msg, menu);
}

function handleEdit(msg: Message) {
  chooseGroup(msg, msg.from?.username || '');
}

function handleCallback(query: CallbackQuery) {
  // Respond to a keyboard callback button pressed.
  const msg = query.message;
  const { action, data } = JSON.parse(query.data || '');
  switch (action) {
    case 'nav-menu':
      if (msg && data) {
        const menu = getMenu(data);
        replaceMenu(msg, menu);
      }
      break;

    case 'choose-group':
      if (msg) {
        chooseGroup(msg, msg.chat.username || '');
      }
      break;

    case 'choose-menu':
      if (msg && (data !== undefined)) {
        const menus = getGroupMenus(data);
        chooseMenu(msg, menus);
      }
      break;

    case 'add-menu':
      if (msg) {
        addMenu(msg, data);
      }
      break;

    case 'edit-menu':
      if (msg && data) {
        const menu = getMenu(data);
        editMenu(msg, menu);
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

    case 'add-global-entry':
      if (msg && data) {
        addGlobalEntry(msg, data);
      }
      break;

    case 'remove-entry':
      if (msg && data) {
        removeEntry(msg, data);
      }
      break;

    case 'remove-entry-entry':
      if (msg && data) {
        removeEntryEntry(msg, data);
      }
      break;

    case 'move-entry':
      if (msg && data) {
        moveEntry(msg, data);
      }
      break;

    case 'move-entry-entry':
      if (msg && data) {
        moveEntryEntry(msg, data);
      }
      break;

    case 'rename-menu':
      if (msg && data) {
        renameMenu(msg, data);
      }
      break;

    case 'remove-menu':
      if (msg && data) {
        removeMenu(msg, data);
      }
      break;

    case 'remove-menu-confirm':
      if (msg && data) {
        removeMenuConfirm(msg, data);
      }
      break;
  }
}

function handleTextMessage(msg: Message) {
  const context = getContext(msg);
  switch (context?.state) {
    case 'add-menu-title':
      addMenuTitle(msg);
    break;

    case 'add-menu-entry-title':
      addMenuEntryTitle(msg);
    break;

    case 'add-url-entry-title':
      addUrlEntryTitle(msg);
    break;

    case 'add-url-entry-url':
      addUrlEntryUrl(msg);
    break;

    case 'add-global-entry-title':
      addGlobalEntryTitle(msg);
    break;

    case 'move-entry-pos':
      moveEntryPos(msg);
    break;

    case 'rename-menu-title':
      renameMenuTitle(msg);
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
    const menus = getGroupMenus(groups[0]);
    chooseMenu(msg, menus);
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

function addMenu(msg: Message, groupTitle: string) {
  startDialog(msg, 'add-menu-title');
  setValue(msg, 'groupTitle', groupTitle);
  bot.sendMessage(
    msg.chat.id,
    'Ok. Por favor, escribe el título del menú.'
  );
}

function addMenuTitle(msg: Message) {
  setValue(msg, 'menuTitle', msg.text || '');
  const context = getContext(msg);
  if (context.values.menuTitle) {
    const menu = addNewMenu(context.values.menuTitle, context.values.groupTitle);
    bot
      .sendMessage(
        msg.chat.id,
        'Correcto! Menú añadido. Ahora puedes añadirle opciones.'
      )
      .then((msg2: Message) => {
        endDialog(msg2);
        editMenu(msg2, menu);
      });
  }
}

function editMenu(msg: Message, menu: Menu) {
  const buttons: InlineKeyboardButton[] = [];
  buttons.push(actionKeyboardButton('Añadir entrada', 'add-entry', menu.id));
  if (menu.entries.length > 0) {
    buttons.push(actionKeyboardButton('Borrar entrada', 'remove-entry', menu.id));
    buttons.push(actionKeyboardButton('Mover entrada', 'move-entry', menu.id));
  }
  buttons.push(actionKeyboardButton('Renombrar menú', 'rename-menu', menu.id));
  buttons.push(actionKeyboardButton('Añadir menú', 'add-menu', menu.groupTitle));
  if (!menu.isDefault) {
    buttons.push(actionKeyboardButton('Borrar menú', 'remove-menu', menu.id));
  }
  buttons.push(actionKeyboardButton('« Volver a menús', 'choose-menu', menu.groupTitle));

  // Group buttons in rows by two
  let button_rows: InlineKeyboardButton[][] = [];
  while (buttons.length > 0) {
    let button_row: InlineKeyboardButton[] = [];
    button_row.push(buttons.shift()!);
    if (buttons.length > 0) {
      button_row.push(buttons.shift()!);
    }
    button_rows.push(button_row);
  }

  bot.sendMessage(msg.chat.id, 'Modificación de menú\n' + menu2Html(menu), {
    parse_mode: 'HTML',
    reply_markup: keyboardMarkup(button_rows),
  });

  // bot.sendMessage(msg.chat.id, 'Modificación de menú\n' + menu2Markdown(menu), {
  //   parse_mode: 'MarkdownV2',
  //   reply_markup: keyboardMarkup(button_rows),
  // });
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
          [
            actionKeyboardButton('« Volver al menú', 'edit-menu', menuId),
          ]
        ]),
      }
    )
    .then((msg2: Message) => {
      startDialog(msg2, 'add-entry');
    });
}

function addMenuEntry(msg: Message, menuId: string) {
  setValue(msg, 'menuId', menuId);
  bot
    .sendMessage(
      msg.chat.id,
      'Ok. Por favor, escribe el título de la nueva entrada.'
    )
    .then((msg2: Message) => {
      setState(msg, 'add-menu-entry-title');
    });
}

function addMenuEntryTitle(msg: Message) {
  setValue(msg, 'entryTitle', msg.text || '');
  const context = getContext(msg);
  const menu = getMenu(context.values.menuId);
  const menus = getGroupMenus(menu.groupTitle);
  const otherMenus = menus.filter((m) => m.id !== context.values.menuId);
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
}

function addMenuEntryMenu(msg: Message, menuId: string) {
  setValue(msg, 'entryMenu', menuId);
  const context = getContext(msg);
  if (context.values.menuId && context.values.entryTitle && context.values.entryMenu) {
    const menu = addEntryToMenu(
      context.values.menuId,
      {
        text: context.values.entryTitle, // TODO: validate inputs
        menu: context.values.entryMenu,
      }
    );
    bot
      .sendMessage(
        msg.chat.id,
        'Correcto! Entrada añadida. Puedes seguir modificando el menú.'
      )
      .then((msg2: Message) => {
        editMenu(msg2, menu);
      });
  }
}

function addUrlEntry(msg: Message, menuId: string) {
  setValue(msg, 'menuId', menuId);
  bot
    .sendMessage(
      msg.chat.id,
      'Ok. Por favor, escribe el título de la nueva entrada.'
    )
    .then((msg2: Message) => {
      setState(msg, 'add-url-entry-title');
    });
}

function addUrlEntryTitle(msg: Message) {
  setValue(msg, 'entryTitle', msg.text || '');
  bot
    .sendMessage(
      msg.chat.id,
      'Muy bien. Ahora escribe la dirección web a la que quieres ir.'
    )
    .then((msg2: Message) => {
      setState(msg, 'add-url-entry-url');
    });
}

function addUrlEntryUrl(msg: Message) {
  setValue(msg, 'entryUrl', msg.text || '');
  const context = getContext(msg);
  if (context.values.menuId && context.values.entryTitle && context.values.entryUrl) {
    const menu = addEntryToMenu(
      context.values.menuId,
      {
        text: context.values.entryTitle, // TODO: validate inputs
        url: context.values.entryUrl,
      }
    );
    bot
      .sendMessage(
        msg.chat.id,
        'Correcto! Entrada añadida. Puedes seguir modificando el menú.'
      )
      .then((msg2: Message) => {
        editMenu(msg2, menu);
      });
  }
}

function addGlobalEntry(msg: Message, menuId: string) {
  setValue(msg, 'menuId', menuId);
  bot
    .sendMessage(
      msg.chat.id,
      'Ok. Por favor, escribe el título de la nueva entrada.'
    )
    .then((msg2: Message) => {
      setState(msg, 'add-global-entry-title');
    });
}

function addGlobalEntryTitle(msg: Message) {
  setValue(msg, 'entryTitle', msg.text || '');
  const context = getContext(msg);
  if (context.values.menuId && context.values.entryTitle) {
    const globalMenu = getDefaultMenu(null);
    const menu = addEntryToMenu(
      context.values.menuId,
      {
        text: context.values.entryTitle, // TODO: validate inputs
        menu: globalMenu.id,
      }
    );
    bot
      .sendMessage(
        msg.chat.id,
        'Correcto! Entrada añadida. Puedes seguir modificando el menú.'
      )
      .then((msg2: Message) => {
        editMenu(msg2, menu);
      });
  }
}

function removeEntry(msg: Message, menuId: string) {
  const menu = getMenu(menuId);
  bot
    .sendMessage(
      msg.chat.id,
      'Elige la entrada que quieres borrar', {
        reply_markup: keyboardMarkup(
          menu.entries.map((entry: MenuEntry, index: number) => {
            return [
              actionKeyboardButton(entry.text, 'remove-entry-entry', index.toString())
            ];
          }).concat([
            [
              actionKeyboardButton('« Volver al menú', 'edit-menu', menuId),
            ]
          ])
        )
      }
    )
    .then((msg2: Message) => {
      startDialog(msg2, 'remove-entry-entry');
      setValue(msg2, 'menuId', menuId);
    });
}

function removeEntryEntry(msg: Message, entryIndex: string) {
  const context = getContext(msg);
  const menu = removeEntryFromMenu(
    context.values.menuId,
    parseInt(entryIndex)
  );
  bot
    .sendMessage(
      msg.chat.id,
      'Correcto! Entrada borrada. Puedes seguir modificando el menú.'
    )
    .then((msg2: Message) => {
      editMenu(msg2, menu);
    });
}

function moveEntry(msg: Message, menuId: string) {
  const menu = getMenu(menuId);
  bot
  .sendMessage(
    msg.chat.id,
    'Elige la entrada que quieres mover', {
      reply_markup: keyboardMarkup(
        menu.entries.map((entry: MenuEntry, index: number) => {
          return [
            actionKeyboardButton(entry.text, 'move-entry-entry', index.toString())
          ];
        }).concat([
          [
            actionKeyboardButton('« Volver al menú', 'edit-menu', menuId),
          ]
        ])
      )
    }
  )
  .then((msg2: Message) => {
    startDialog(msg2, 'move-entry-entry');
    setValue(msg2, 'menuId', menuId);
  });
}

function moveEntryEntry(msg: Message, entryIndex: string) {
  setValue(msg, 'entryIndex', entryIndex);
  const context = getContext(msg);
  const menu = getMenu(context.values.menuId);
  bot
    .sendMessage(
      msg.chat.id,
      'Ok. Ahora dime a qué posición la quieres mover ' +
        '(un número del 1 al ' + menu.entries.length + ').'
    )
    .then((msg2: Message) => {
      setState(msg, 'move-entry-pos');
    });
}

function moveEntryPos(msg: Message) {
  const context = getContext(msg);
  const menu = getMenu(context.values.menuId);

  const intPos = parseInt(msg.text || '', 10);
  if (!(intPos >= 1 && intPos <= menu.entries.length)) {
    bot.sendMessage(
      msg.chat.id,
      'Esa posición no es correcta. Tiene que ser ' +
        'un número del 1 al ' + menu.entries.length + '.'
    )
  } else {
    const menu = moveEntryInMenu(
      context.values.menuId,
      parseInt(context.values.entryIndex),
      intPos - 1
    );
    bot
      .sendMessage(
        msg.chat.id,
        'Correcto! Entrada movida. Puedes seguir modificando el menú.'
      )
      .then((msg2: Message) => {
        editMenu(msg2, menu);
      });
  }
}

function renameMenu(msg: Message, menuId: string) {
  startDialog(msg, 'rename-menu');
  setValue(msg, 'menuId', menuId);
  bot
    .sendMessage(
      msg.chat.id,
      'Por favor, escribe nuevo título del menú.'
    )
    .then((msg2: Message) => {
      startDialog(msg2, 'rename-menu-title');
      setValue(msg2, 'menuId', menuId);
    });
}

function renameMenuTitle(msg: Message) {
  const context = getContext(msg);
  const menu = changeMenuTitle(context.values.menuId, msg.text || '');
  bot
    .sendMessage(
      msg.chat.id,
      'Correcto! Título cambiado. Puedes seguir modificando el menú.'
    )
    .then((msg2: Message) => {
      editMenu(msg2, menu);
    });
}

function removeMenu(msg: Message, menuId: string) {
  const menu = getMenu(menuId);
  bot.sendMessage(
    msg.chat.id,
    'ATENCIÓN: Vas a borrar el menú ' + menu.title + '.', {
      reply_markup: keyboardMarkup([
        [ actionKeyboardButton('CONFIRMAR', 'remove-menu-confirm', menuId) ],
        [ actionKeyboardButton('Cancelar', 'edit-menu', menuId) ],
      ])
    }
  );
}

function removeMenuConfirm(msg: Message, menuId: string) {
  const menu = getMenu(menuId);
  removeWholeMenu(menuId);
  bot
    .sendMessage(
      msg.chat.id,
      'Ok, menú borrado. Puedes elegir otro para editar.',
    )
    .then((msg2: Message) => {
      const menus = getGroupMenus(menu.groupTitle);
      chooseMenu(msg, menus);
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
