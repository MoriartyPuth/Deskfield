import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const SEARCH_DELAY_MS = 120;
const ICON_SIZE = 22;

export const DeskfieldPanel = GObject.registerClass(
class DeskfieldPanel extends St.BoxLayout {
    _init(settings, engine) {
        super._init({
            style_class: 'deskfield-panel',
            orientation: Clutter.Orientation.VERTICAL,
            reactive: true,
        });

        this._settings = settings;
        this._engine = engine;
        this._cancellable = new Gio.Cancellable();
        this._results = [];
        this._rows = [];
        this._selectedIndex = -1;
        this._generation = 0;
        this._searchTimeoutId = 0;

        this._entry = new St.Entry({
            style_class: 'deskfield-entry',
            hint_text: 'Search applications and settings…',
            can_focus: true,
        });
        this._resultsBox = new St.BoxLayout({
            style_class: 'deskfield-results',
            orientation: Clutter.Orientation.VERTICAL,
            visible: false,
        });
        this.add_child(this._entry);
        this.add_child(this._resultsBox);

        const text = this._entry.clutter_text;
        this._changedId = text.connect('text-changed', () => this._scheduleSearch());
        this._activateId = text.connect('activate', () => this._activateSelected());
        this._keyPressId = text.connect('key-press-event', (_actor, event) => this._onKeyPress(event));
        this._focusInId = text.connect('key-focus-in', () => this._onFocusIn());
        this._focusOutId = text.connect('key-focus-out', () => this._onFocusOut());
        this._stageEventId = 0;

        this._settingsIds = [
            this._settings.connect('changed::position-x', () => this._updateLayout()),
            this._settings.connect('changed::position-y', () => this._updateLayout()),
            this._settings.connect('changed::field-width', () => this._updateLayout()),
            this._settings.connect('changed::show-icon', () => this._updateIcon()),
        ];
        this._monitorsId = Main.layoutManager.connect('monitors-changed',
            () => this._updateLayout());

        this._updateIcon();
        this._updateLayout();
    }

    focusSearch() {
        this._entry.grab_key_focus();
    }

    reset() {
        this._entry.set_text('');
        this._clearResults();
        global.stage.set_key_focus(null);
    }

    _updateIcon() {
        if (this._settings.get_boolean('show-icon')) {
            this._entry.set_primary_icon(new St.Icon({
                icon_name: 'edit-find-symbolic',
                style_class: 'deskfield-icon',
            }));
        } else {
            this._entry.set_primary_icon(null);
        }
    }

    _updateLayout() {
        const monitor = Main.layoutManager.primaryMonitor;
        if (monitor === null)
            return;

        const width = this._settings.get_int('field-width');
        this._entry.set_width(width);
        this._resultsBox.set_width(width);

        const centreX = this._settings.get_double('position-x') / 100;
        const offsetY = this._settings.get_double('position-y') / 100;
        this.set_position(
            monitor.x + Math.round(monitor.width * centreX - width / 2),
            monitor.y + Main.panel.height + Math.round(monitor.height * offsetY));
    }

    _scheduleSearch() {
        if (this._searchTimeoutId !== 0)
            GLib.Source.remove(this._searchTimeoutId);
        this._searchTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, SEARCH_DELAY_MS, () => {
            this._searchTimeoutId = 0;
            this._runSearch();
            return GLib.SOURCE_REMOVE;
        });
    }

    _runSearch() {
        const query = this._entry.get_text().trim();
        this._generation++;
        const generation = this._generation;

        if (query === '') {
            this._clearResults();
            return;
        }

        const limit = this._settings.get_int('max-results');
        this._showResults(this._engine.searchApps(query, limit));

        this._engine.searchRemote(query, limit, this._cancellable).then(remote => {
            if (this._cancellable.is_cancelled() || generation !== this._generation || remote.length === 0)
                return;
            const combined = this._results.concat(remote).slice(0, limit);
            this._showResults(combined);
        });
    }

    _showResults(results) {
        this._clearResults();
        this._results = results;
        if (results.length === 0)
            return;

        results.forEach((result, index) => {
            const row = this._createRow(result, index);
            this._rows.push(row);
            this._resultsBox.add_child(row);
        });
        this._setSelection(0);
        this._resultsBox.show();
    }

    _createRow(result, index) {
        const row = new St.Button({style_class: 'deskfield-result', can_focus: false});
        const box = new St.BoxLayout({style_class: 'deskfield-result-box'});
        box.add_child(result.createIcon(ICON_SIZE));

        const labels = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            x_expand: true,
        });
        labels.add_child(new St.Label({style_class: 'deskfield-result-name', text: result.name}));
        if (result.description !== '') {
            labels.add_child(new St.Label({
                style_class: 'deskfield-result-description',
                text: result.description,
            }));
        }
        box.add_child(labels);
        row.set_child(box);
        row.connect('clicked', () => this._activate(index));
        return row;
    }

    // Watch for clicks outside the panel only while focused, so clicking away
    // dismisses the field like the overview search does.
    _onFocusIn() {
        if (this._stageEventId === 0)
            this._stageEventId = global.stage.connect('captured-event',
                (_actor, event) => this._onStageEvent(event));
    }

    _onFocusOut() {
        if (this._stageEventId !== 0) {
            global.stage.disconnect(this._stageEventId);
            this._stageEventId = 0;
        }
        this._entry.set_text('');
        this._clearResults();
    }

    _onStageEvent(event) {
        if (event.type() === Clutter.EventType.BUTTON_PRESS) {
            const target = event.get_source();
            if (target === null || !this.contains(target))
                global.stage.set_key_focus(null);
        }
        return Clutter.EVENT_PROPAGATE;
    }

    _onKeyPress(event) {
        const symbol = event.get_key_symbol();
        if (symbol === Clutter.KEY_Escape) {
            this.reset();
            return Clutter.EVENT_STOP;
        }
        if (symbol === Clutter.KEY_Down) {
            this._moveSelection(1);
            return Clutter.EVENT_STOP;
        }
        if (symbol === Clutter.KEY_Up) {
            this._moveSelection(-1);
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }

    _moveSelection(delta) {
        if (this._results.length === 0)
            return;
        const count = this._results.length;
        this._setSelection((this._selectedIndex + delta + count) % count);
    }

    _setSelection(index) {
        if (this._selectedIndex >= 0 && this._selectedIndex < this._rows.length)
            this._rows[this._selectedIndex].remove_style_pseudo_class('selected');
        this._selectedIndex = index;
        if (index >= 0 && index < this._rows.length)
            this._rows[index].add_style_pseudo_class('selected');
    }

    _activateSelected() {
        if (this._selectedIndex >= 0)
            this._activate(this._selectedIndex);
    }

    _activate(index) {
        const result = this._results[index];
        if (result === undefined)
            return;
        this.reset();
        result.activate();
    }

    _clearResults() {
        for (const row of this._rows)
            row.destroy();
        this._rows = [];
        this._results = [];
        this._selectedIndex = -1;
        this._resultsBox.hide();
    }

    destroy() {
        this._cancellable.cancel();
        if (this._searchTimeoutId !== 0) {
            GLib.Source.remove(this._searchTimeoutId);
            this._searchTimeoutId = 0;
        }
        if (this._stageEventId !== 0)
            global.stage.disconnect(this._stageEventId);
        Main.layoutManager.disconnect(this._monitorsId);
        for (const id of this._settingsIds)
            this._settings.disconnect(id);
        const text = this._entry.clutter_text;
        text.disconnect(this._changedId);
        text.disconnect(this._activateId);
        text.disconnect(this._keyPressId);
        text.disconnect(this._focusInId);
        text.disconnect(this._focusOutId);

        this._settings = null;
        this._engine = null;

        super.destroy();
    }
});
