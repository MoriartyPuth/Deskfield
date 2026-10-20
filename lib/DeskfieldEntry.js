import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export const DeskfieldEntry = GObject.registerClass({
    GTypeName: 'DeskfieldEntry',
    Signals: {
        'search-activated': {param_types: [GObject.TYPE_STRING]},
    },
}, class DeskfieldEntry extends St.Entry {
    _init(settings) {
        super._init({
            style_class: 'deskfield-entry',
            hint_text: 'Search applications…',
            can_focus: true,
            reactive: true,
            track_hover: true,
        });

        this._settings = settings;

        this._pressId = this.connect('button-press-event', () => {
            this.grab_key_focus();
            return Clutter.EVENT_PROPAGATE;
        });

        const text = this.clutter_text;
        this._activateId = text.connect('activate', () => {
            this.emit('search-activated', text.get_text());
        });
        this._keyPressId = text.connect('key-press-event', (_actor, event) => {
            if (event.get_key_symbol() === Clutter.KEY_Escape) {
                this.reset();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        this._settingsIds = [
            this._settings.connect('changed::position-x', () => this._updatePosition()),
            this._settings.connect('changed::position-y', () => this._updatePosition()),
            this._settings.connect('changed::field-width', () => this._updateWidth()),
            this._settings.connect('changed::show-icon', () => this._updateIcon()),
        ];
        this._monitorsId = Main.layoutManager.connect('monitors-changed',
            () => this._updatePosition());

        this._updateWidth();
        this._updateIcon();
        this._updatePosition();
    }

    focusSearch() {
        this.grab_key_focus();
    }

    reset() {
        this.set_text('');
        global.stage.set_key_focus(null);
    }

    _updateWidth() {
        this.set_width(this._settings.get_int('field-width'));
    }

    _updateIcon() {
        if (this._settings.get_boolean('show-icon')) {
            this.set_primary_icon(new St.Icon({
                icon_name: 'edit-find-symbolic',
                style_class: 'deskfield-icon',
            }));
        } else {
            this.set_primary_icon(null);
        }
    }

    _updatePosition() {
        const monitor = Main.layoutManager.primaryMonitor;
        if (monitor === null)
            return;

        const x = this._settings.get_double('position-x') / 100;
        const y = this._settings.get_double('position-y') / 100;
        this.set_position(
            monitor.x + Math.round(monitor.width * x),
            monitor.y + Math.round(monitor.height * y));
    }

    destroy() {
        Main.layoutManager.disconnect(this._monitorsId);
        for (const id of this._settingsIds)
            this._settings.disconnect(id);
        this.clutter_text.disconnect(this._activateId);
        this.clutter_text.disconnect(this._keyPressId);
        this.disconnect(this._pressId);

        this._settings = null;

        super.destroy();
    }
});
