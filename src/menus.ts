import * as Datastore from 'nedb';

import { users, menus } from './config';

export interface Menu {
  id: string;
  title: string;
  groupTitle: string | null;
  isDefault: boolean;
  entries: MenuEntry[];
}

export interface MenuEntry {
  text: string;
  menu?: string;
  url?: string;
}

const db = {
  menus: new Datastore({ filename: './menus.db', autoload: true }),
};

export function initMenus() {
  // Auto compact database each 10 minutes
  db.menus.persistence.setAutocompactionInterval(600000);

  db.menus.count({ groupTitle: null }, (err, count) => {
    if (!err && count === 0) {
      for (let menu of Object.values(menus)) {
        db.menus.insert(menu);
      }
    }
  });
}

export function getDefaultMenu(groupTitle: string | null, cb) {
  db.menus.findOne({ groupTitle: groupTitle, isDefault: true }, (err, menu) => {
    if (!err) {
      cb(menu);
    } else {
      console.error('Error: ', err);
    }
  });
}

export function getMenu(menuId: string, cb) {
  db.menus.findOne({ id: menuId }, (err, menu) => {
    if (!err) {
      cb(menu);
    } else {
      console.error('Error: ', err);
    }
  });
}

export function getUserGroups(username: string): string[] | undefined {
  return users[username];
}

export function getGroupMenus(groupTitle: string | null, cb) {
  db.menus
    .find({ groupTitle: groupTitle })
    .sort({ isDefault: -1, title: 1})
    .exec((err, menus) => {
      if (!err) {
        cb(menus);
      } else {
        console.error('Error: ', err);
      }
    });
}

export function menu2Markdown(menu: Menu) {
  return (
    '*' +
    menu.title +
    (menu.isDefault ? ' \\(\\*\\)' : '') +
    '*\n' +
    menu.entries.map(entry => ' \\- _' + entry.text + '_').join('\n')
  );
}

export function addEntryToMenu(menuId: string, entry: MenuEntry, cb) {
  db.menus.update(
    { id: menuId },
    { $push: { entries: entry } },
    { returnUpdatedDocs: true },
    cb
  );
}

export function removeEntryFromMenu(menuId: string, entryText: string, cb) {
  db.menus.findOne({ id: menuId }, (err, menu) => {
    if (!err) {
      const newEntries = menu.entries.filter((e) => !e.text.startsWith(entryText));
      db.menus.update(
        { id: menuId },
        { $set: { entries: newEntries } },
        { returnUpdatedDocs: true },
        cb
      );
    } else {
      console.error('Error: ', err);
    }
  });
}
