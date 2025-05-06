import { UI_IDS } from './constants.js'; // Updated import path
// MenuBarView: メニューバーのUI生成のみを担当
export const createMenuBarView = () => {
    const menuBar = document.createElement('div');
    menuBar.id = UI_IDS.MENU_BAR;
    menuBar.classList.add('menu-bar');


    /**
     * メニューバーに新しいメニューグループを追加する
     * @param {HTMLElement} menuBar - createMenuBarViewで生成したメニューバー要素
     * @param {string} groupId - 追加するグループのid属性
     * @param {string} [label] - グループのラベル（任意）
     * @returns {HTMLElement} 追加されたグループ要素
     */
    menuBar.addMenuGroup = (groupId, label) => {
        const group = document.createElement('div');
        group.classList.add('menu-group');
        group.id = groupId;
        if (label) {
            const span = document.createElement('span');
            span.classList.add('menu-group-label');
            span.textContent = label;
            group.appendChild(span);
        }
        menuBar.appendChild(group);


        /**
         * メニューグループにメニュー項目（ボタン）を追加する
         */
        group.addMenuItem = (buttonid, icon, caption, action) => {
            const newItem = document.createElement('button');
            newItem.id = buttonid;
            newItem.classList.add('menu-button');
            newItem.innerHTML = `<span class="material-symbols-outlined">${icon}</span> ${caption}`;
            newItem.addEventListener('click', action);
            group.appendChild(newItem);
            return group
        }

        /**
         * メニューグループからメニュー項目（ボタン等）を削除する
         * @param {string} menuItemId - 削除するメニュー項目のid属性
         */
        group.removeMenuItem = (menuItemId) => {
            const item = group.querySelector(`#${menuItemId}`);
            if (item) group.removeChild(item);
            return group
        }


        return group;
    }

    /**
     * メニューバーからメニューグループを削除する
     * @param {HTMLElement} menuBar - createMenuBarViewで生成したメニューバー要素
     * @param {string} groupId - 削除するグループのid属性
     */
    menuBar.removeMenuGroup = (groupId) => {
        const group = menuBar.querySelector(`#${groupId}`);
        if (group) {
            menuBar.removeChild(group);
        }
    }

    return menuBar;
};
