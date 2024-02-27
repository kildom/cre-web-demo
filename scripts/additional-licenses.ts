
import * as fs from 'node:fs';

export const LICENSES = [
    {
        licenses: "MPL-2.0",
        repository: "https://searchfox.org/mozilla-central/source/js/src",
        publisher: "Mozilla Foundation",
        url: "https://spidermonkey.dev/",
        paths: new Set(),
        files: [],
        licenseFile: '',
        modules: new Set(['js.wasm']),
        priority: 0,
        licenseText: fs.readFileSync('ext/MPL-2.0.txt', 'utf8'),
    }
];
