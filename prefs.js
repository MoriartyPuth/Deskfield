import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

function buildShortcutRow(settings, window) {
    const row = new Adw.ActionRow({
        title: 'Focus shortcut',
        subtitle: 'Press Backspace while capturing to clear it',
    });

    const label = new Gtk.ShortcutLabel({
        valign: Gtk.Align.CENTER,
        disabled_text: 'Disabled',
    });
    const button = new Gtk.Button({label: 'Set…', valign: Gtk.Align.CENTER});

    const updateLabel = () => {
        const [accelerator] = settings.get_strv('focus-shortcut');
        label.set_accelerator(accelerator ?? '');
    };
    updateLabel();
    settings.connect('changed::focus-shortcut', updateLabel);

    button.connect('clicked', () => {
        button.set_label('Press a shortcut…');
        const controller = new Gtk.EventControllerKey();
        window.add_controller(controller);

        const stopCapture = () => {
            window.remove_controller(controller);
            button.set_label('Set…');
        };

        controller.connect('key-pressed', (_controller, keyval, _keycode, state) => {
            const mask = state & Gtk.accelerator_get_default_mod_mask();

            if (keyval === Gdk.KEY_Escape && mask === 0) {
                stopCapture();
                return Gdk.EVENT_STOP;
            }
            if (keyval === Gdk.KEY_BackSpace && mask === 0) {
                settings.set_strv('focus-shortcut', []);
                stopCapture();
                return Gdk.EVENT_STOP;
            }
            if (mask !== 0 && Gtk.accelerator_valid(keyval, mask)) {
                settings.set_strv('focus-shortcut', [Gtk.accelerator_name(keyval, mask)]);
                stopCapture();
            }
            return Gdk.EVENT_STOP;
        });
    });

    row.add_suffix(label);
    row.add_suffix(button);
    row.activatable_widget = button;
    return row;
}

// The field-width key is an integer, so it is synced by hand rather than bound
// to the spin row's floating-point value property.
function buildWidthRow(settings) {
    const row = new Adw.SpinRow({
        title: 'Width',
        subtitle: 'Field width in pixels',
        adjustment: new Gtk.Adjustment({lower: 150, upper: 800, step_increment: 10}),
    });

    row.set_value(settings.get_int('field-width'));
    row.connect('notify::value', () => {
        const value = row.get_value();
        if (value !== settings.get_int('field-width'))
            settings.set_int('field-width', value);
    });
    settings.connect('changed::field-width',
        () => row.set_value(settings.get_int('field-width')));

    return row;
}

export default class DeskfieldPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();

        const position = new Adw.PreferencesGroup({
            title: 'Position',
            description: 'Where the field sits on the desktop, as a percentage of the primary monitor.',
        });
        const xRow = new Adw.SpinRow({
            title: 'Horizontal',
            adjustment: new Gtk.Adjustment({lower: 0, upper: 100, step_increment: 1}),
            digits: 1,
        });
        const yRow = new Adw.SpinRow({
            title: 'Vertical',
            adjustment: new Gtk.Adjustment({lower: 0, upper: 100, step_increment: 1}),
            digits: 1,
        });
        settings.bind('position-x', xRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        settings.bind('position-y', yRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        position.add(xRow);
        position.add(yRow);

        const appearance = new Adw.PreferencesGroup({title: 'Appearance'});
        const iconRow = new Adw.SwitchRow({title: 'Show search icon'});
        settings.bind('show-icon', iconRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        appearance.add(buildWidthRow(settings));
        appearance.add(iconRow);

        const shortcut = new Adw.PreferencesGroup({title: 'Shortcut'});
        shortcut.add(buildShortcutRow(settings, window));

        page.add(position);
        page.add(appearance);
        page.add(shortcut);
        window.add(page);
    }
}
