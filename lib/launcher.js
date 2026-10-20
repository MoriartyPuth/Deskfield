import Gio from 'gi://Gio';

// Match scores, lowest is the strongest match.
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

// Find the best matching application for a query. Ties on score are broken by
// the shorter display name, so "fire" prefers "Firefox" over "Firewall".
function findBestMatch(query) {
    let best = null;
    let bestScore = Number.MAX_SAFE_INTEGER;
    let bestLength = Number.MAX_SAFE_INTEGER;

    for (const app of Gio.AppInfo.get_all()) {
        if (!app.should_show())
            continue;

        const score = scoreApp(app, query);
        if (score === NO_MATCH)
            continue;

        const length = app.get_display_name().length;
        if (score < bestScore || (score === bestScore && length < bestLength)) {
            best = app;
            bestScore = score;
            bestLength = length;
        }
    }

    return best;
}

// Launch the application that best matches the query. Returns true when an
// application was launched, false when nothing matched.
export function launchBestMatch(query) {
    const normalized = query.trim().toLowerCase();
    if (normalized === '')
        return false;

    const app = findBestMatch(normalized);
    if (app === null)
        return false;

    app.launch([], global.create_app_launch_context(0, -1));
    return true;
}
