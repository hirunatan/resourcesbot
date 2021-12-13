import {startMenu, startGroups, menus} from "./config";

export interface Menu {
  title: string;
  entries: MenuEntry[];
}

export interface MenuEntry {
  text: string;
  menu: string;
  url: string;
}

export function getStartMenu(groupTitle: string | null): Menu {
  let menuId = startMenu;
  if (groupTitle) {
    const startGroup = startGroups[groupTitle];
    if (startGroup) {
      menuId = startGroup;
    }
  }
  return getMenu(menuId);
}


export function getMenu(menuId: string): Menu {
  return menus[menuId];
}

