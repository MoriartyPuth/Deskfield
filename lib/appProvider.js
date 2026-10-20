import Gio from 'gi://Gio';
import St from 'gi://St';

const SCORE_EXACT_NAME = 0;
const SCORE_NAME_PREFIX = 1;
const SCORE_ID_PREFIX = 2;
const SCORE_WORD_PREFIX = 3;
const SCORE_NAME_CONTAINS = 4;
const SCORE_ID_CONTAINS = 5;
const NO_MATCH = -1;

function scoreApp(app, query) {
    const name = app.get_display_name().toLowerCase();
    const id = (app.get_id() ?? '').toLowerCase();
    const executable = (app.get_executable() ?? '').toLowerCase();

    if (name === query)
        return SCORE_EXACT_NAME;
    if (name.startsWith(query))
        return SCORE_NAME_PREFIX;
    if (executable === query || id.startsWith(query))
        return SCORE_ID_PREFIX;
    if (name.split(/\s+/).some(word => word.startsWith(query)))
        return SCORE_WORD_PREFIX;
    if (name.includes(query))
        return SCORE_NAME_CONTAINS;
    if (executable.includes(query) || id.includes(query))
        return SCORE_ID_CONTAINS;
    return NO_MATCH;
}

function toResult(app) {
    return {
        id: `app:${app.get_id()}`,
        name: app.get_display_name(),
        description: app.get_description() ?? '',
        createIcon: size => new St.Icon({gicon: app.get_icon(), icon_size: size}),
        activate: () => app.launch([], global.create_app_launch_context(0, -1)),
    };
}

// Return application results for a query, best match first, ties broken by the
// shorter name so "fire" prefers Firefox over Firewall.
export function searchApps(query, limit) {
    const normalized = query.trim().toLowerCase();
    if (normalized === '')
        return [];

    const scored = [];
    for (const app of Gio.AppInfo.get_all()) {
        if (!app.should_show())
            continue;
        const score = scoreApp(app, normalized);
        if (score !== NO_MATCH)
            scored.push({app, score, length: app.get_display_name().length});
    }

    scored.sort((a, b) => a.score - b.score || a.length - b.length);
    return scored.slice(0, limit).map(entry => toResult(entry.app));
}
