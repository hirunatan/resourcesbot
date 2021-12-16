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

export function menu2Html(menu: Menu) {
  return (
    '<b>' +
    menu.title +
    (menu.isDefault ? ' (*)' : '') +
    '</b>\n' +
    menu.entries.map(entry => '<i> - ' + entry.text + '</i>').join('\n')
  );
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

export function addNewMenu(title: string, groupTitle: string, cb) {
  db.menus.insert({
    id: title.slice(0, 30).toLowerCase().replace(' ', '_'),
    title: title,
    groupTitle: groupTitle,
    isDefault: false,
    entries: [],
  }, cb);
}

export function removeWholeMenu(menuId: string, cb) {
  db.menus.remove(
    { id: menuId },
    {},
    cb
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

export function removeEntryFromMenu(menuId: string, entryIndex: number, cb) {
  db.menus.findOne({ id: menuId }, (err, menu) => {
    if (!err) {
      const newEntries = removeAt(menu.entries, entryIndex);
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

export function moveEntryInMenu(menuId: string, entryIndex: number, newIndex: number, cb) {
  db.menus.findOne({ id: menuId }, (err, menu) => {
    if (!err) {
      const newEntries = moveArrayElement(menu.entries, entryIndex, newIndex); 
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

function moveArrayElement(array, index, destIndex) {
  if (index <= destIndex) {
    const [before, after] = splitArray(array, destIndex + 1);
    const before2 = removeAt(before, index);
    return before2.concat([array[index]]).concat(after);
  } else {
    const [before, after] = splitArray(array, destIndex);
    const after2 = removeAt(after, index - before.length);
    return before.concat([array[index]]).concat(after2);
  }
}

function splitArray(array, index) {
  return [array.slice(0, index), array.slice(index)];
}

function removeAt(array, index) {
  return array.slice(0, index).concat(array.slice(index + 1));
}

