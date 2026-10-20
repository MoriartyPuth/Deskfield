import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {DeskfieldPanel} from './lib/DeskfieldPanel.js';
import {SearchEngine} from './lib/searchEngine.js';

export default class DeskfieldExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._engine = new SearchEngine();
        this._panel = new DeskfieldPanel(this._settings, this._engine);
        Main.layoutManager.addChrome(this._panel, {trackFullscreen: true});

        Main.wm.addKeybinding(
            'focus-shortcut',
            this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => this._panel.focusSearch());
    }

    disable() {
        Main.wm.removeKeybinding('focus-shortcut');
        Main.layoutManager.removeChrome(this._panel);
        this._panel.destroy();
        this._panel = null;
        this._engine = null;
        this._settings = null;
    }
}
