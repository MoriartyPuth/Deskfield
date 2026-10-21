import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';

import {RemoteProvider} from './remoteProvider.js';
import {searchApps} from './appProvider.js';

const PROVIDER_GROUP = 'Shell Search Provider';

function parseProviderFile(filePath, appSystem) {
    const keyFile = new GLib.KeyFile();
    try {
        keyFile.load_from_file(filePath, GLib.KeyFileFlags.NONE);
    } catch {
        return null;
    }

    let desktopId, busName, objectPath;
    try {
        desktopId = keyFile.get_string(PROVIDER_GROUP, 'DesktopId');
        busName = keyFile.get_string(PROVIDER_GROUP, 'BusName');
        objectPath = keyFile.get_string(PROVIDER_GROUP, 'ObjectPath');
    } catch {
        return null;
    }

    let defaultDisabled = false;
    try {
        defaultDisabled = keyFile.get_boolean(PROVIDER_GROUP, 'DefaultDisabled');
    } catch {
        defaultDisabled = false;
    }
    if (defaultDisabled)
        return null;

    const app = appSystem.lookup_app(desktopId);
    if (app === null)
        return null;
    return new RemoteProvider(app.get_app_info(), busName, objectPath);
}

function loadRemoteProviders() {
    const providers = [];
    const seen = new Set();
    const appSystem = Shell.AppSystem.get_default();
    const dataDirs = [GLib.get_user_data_dir(), ...GLib.get_system_data_dirs()];

    for (const dir of dataDirs) {
        const path = GLib.build_filenamev([dir, 'gnome-shell', 'search-providers']);
        const folder = Gio.File.new_for_path(path);

        let enumerator;
        try {
            enumerator = folder.enumerate_children(
                'standard::name', Gio.FileQueryInfoFlags.NONE, null);
        } catch {
            continue;
        }

        let info = enumerator.next_file(null);
        while (info !== null) {
            const name = info.get_name();
            if (name.endsWith('.ini') && !seen.has(name)) {
                seen.add(name);
                const provider = parseProviderFile(
                    GLib.build_filenamev([path, name]), appSystem);
                if (provider !== null)
                    providers.push(provider);
            }
            info = enumerator.next_file(null);
        }
    }
    return providers;
}

export class SearchEngine {
    constructor() {
        this._providers = loadRemoteProviders();
    }

    searchApps(query, limit) {
        return searchApps(query, limit);
    }

    async searchRemote(query, limit, cancellable) {
        const terms = query.trim().split(/\s+/);
        const lists = await Promise.all(this._providers.map(
            provider => provider.search(terms, limit, cancellable).catch(() => [])));
        return lists.flat();
    }
}
