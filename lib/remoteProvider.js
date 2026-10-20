import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';

const SEARCH_INTERFACE = 'org.gnome.Shell.SearchProvider2';
const CALL_TIMEOUT_MS = 5000;

function callProvider(busName, objectPath, method, parameters, cancellable) {
    return new Promise((resolve, reject) => {
        Gio.DBus.session.call(
            busName, objectPath, SEARCH_INTERFACE, method, parameters, null,
            Gio.DBusCallFlags.NONE, CALL_TIMEOUT_MS, cancellable,
            (connection, result) => {
                try {
                    resolve(connection.call_finish(result));
                } catch (error) {
                    reject(error);
                }
            });
    });
}

function metaIcon(meta, size) {
    if ('gicon' in meta && meta.gicon !== '')
        return new St.Icon({gicon: Gio.icon_new_for_string(meta.gicon), icon_size: size});
    return new St.Icon({icon_name: 'application-x-executable-symbolic', icon_size: size});
}

export class RemoteProvider {
    constructor(appInfo, busName, objectPath) {
        this._appInfo = appInfo;
        this._busName = busName;
        this._objectPath = objectPath;
    }

    get appName() {
        return this._appInfo.get_name();
    }

    async search(terms, limit, cancellable) {
        const idsReply = await callProvider(this._busName, this._objectPath,
            'GetInitialResultSet', new GLib.Variant('(as)', [terms]), cancellable);
        const ids = idsReply.deepUnpack()[0].slice(0, limit);
        if (ids.length === 0)
            return [];

        const metasReply = await callProvider(this._busName, this._objectPath,
            'GetResultMetas', new GLib.Variant('(as)', [ids]), cancellable);
        const metas = metasReply.deepUnpack()[0];

        return metas.map(meta => ({
            id: `${this._busName}:${meta.id}`,
            name: meta.name,
            description: this.appName,
            createIcon: size => metaIcon(meta, size),
            activate: () => this._activate(meta.id, terms),
        }));
    }

    _activate(resultId, terms) {
        const timestamp = global.get_current_time();
        callProvider(this._busName, this._objectPath, 'ActivateResult',
            new GLib.Variant('(sasu)', [resultId, terms, timestamp]), null)
            .catch(() => {});
    }
}
