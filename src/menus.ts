import * as loki from 'lokijs';

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

const db = new loki('./menus.db', {
  autoload: true,
  autosave: true,
  autosaveInterval: 4000,
  autoloadCallback: () => {
    db.menus = db.getCollection('menus');
    if (!db.menus) {
      db.menus = db.addCollection('menus', { autoupdate: true });
      for (let menu of Object.values(menus)) {
        db.menus.insert(menu);
      }
    }
  },
});

export function getDefaultMenu(groupTitle: string | null): Menu {
  return db.menus.findOne({ groupTitle: groupTitle, isDefault: true });
}

export function getMenu(menuId: string): Menu {
  return db.menus.findOne({ id: menuId });
}

export function getUserGroups(username: string): string[] | undefined {
  return users[username];
}

export function getGroupMenus(groupTitle: string | null): Menu[] {
  return db.menus.chain()
    .find({ groupTitle: groupTitle })
    .compoundsort([['isDefault', true], ['title', false]])
    .data();
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

export function addNewMenu(title: string, groupTitle: string): Menu {
  return db.menus.insert({
    id: title.slice(0, 30).toLowerCase().replace(' ', '_'),
    title: title,
    groupTitle: groupTitle,
    isDefault: false,
    entries: [],
  });
}

export function changeMenuTitle(menuId: string, title: string): Menu {
  const menu = db.menus.findOne({ id: menuId });
  menu.title = title;
  db.menus.update(menu);
  return menu;
}

export function removeWholeMenu(menuId: string): void {
  const menu = db.menus.findOne({ id: menuId });
  db.menus.remove(menu);
}

export function addEntryToMenu(menuId: string, entry: MenuEntry): Menu {
  const menu = db.menus.findOne({ id: menuId });
  menu.entries.push(entry);
  db.menus.update(menu);
  return menu;
}

export function removeEntryFromMenu(menuId: string, entryIndex: number): Menu {
  const menu = db.menus.findOne({ id: menuId });
  menu.entries = removeAt(menu.entries, entryIndex);
  db.menus.update(menu);
  return menu;
}

export function moveEntryInMenu(menuId: string, entryIndex: number, newIndex: number): Menu {
  const menu = db.menus.findOne({ id: menuId });
  menu.entries = moveArrayElement(menu.entries, entryIndex, newIndex); 
  db.menus.update(menu);
  return menu;
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

