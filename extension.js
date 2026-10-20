import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {DeskfieldEntry} from './lib/DeskfieldEntry.js';
import {launchBestMatch} from './lib/launcher.js';

export default class DeskfieldExtension extends Extension {
    enable() {
        this._settings = this.getSettings();

        this._entry = new DeskfieldEntry(this._settings);
        this._activatedId = this._entry.connect('search-activated', (_entry, query) => {
            launchBestMatch(query);
            this._entry.reset();
        });
        Main.layoutManager._backgroundGroup.add_child(this._entry);

        Main.wm.addKeybinding(
            'focus-shortcut',
            this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => this._entry.focusSearch());
    }

    disable() {
        Main.wm.removeKeybinding('focus-shortcut');
        this._entry.disconnect(this._activatedId);
        this._entry.destroy();
        this._entry = null;
        this._settings = null;
    }
}
