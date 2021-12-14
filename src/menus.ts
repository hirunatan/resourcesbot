import * as Datastore from 'nedb';

import { menus } from './config';

export interface Menu {
  id: string;
  title: string;
  groupTitle: string | null;
  isDefault: boolean;
  entries: MenuEntry[];
}

export interface MenuEntry {
  text: string;
  menu: string;
  url: string;
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
  db.menus.findOne({ groupTitle: groupTitle, isDefault: true }, (err, doc) => {
    if (!err) {
      cb(doc);
    } else {
      console.error('Error: ', err);
    }
  });
}

export function getMenu(menuId: string, cb) {
  db.menus.findOne({ id: menuId }, (err, doc) => {
    if (!err) {
      cb(doc);
    } else {
      console.error('Error: ', err);
    }
  });
}
