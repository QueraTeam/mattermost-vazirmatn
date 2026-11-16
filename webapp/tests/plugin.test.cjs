const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const vm = require('node:vm');
const babel = require('@babel/core');

const root = path.resolve(__dirname, '..');
const sourceManifest = require('../../plugin.json');

function evaluate(file, globals = {}) {
    const {code} = babel.transformFileSync(path.join(root, file), {
        configFile: false,
        presets: [[require.resolve('@babel/preset-env'), {
            targets: {node: 'current'},
            modules: 'commonjs',
        }]],
    });
    const exports = {};
    vm.runInNewContext(code, {exports, ...globals}, {filename: file});
    return exports;
}

test('generated manifest preserves plugin metadata and contains a build version', () => {
    const {default: manifest} = evaluate('src/manifest.ts');
    for (const [key, value] of Object.entries(sourceManifest)) {
        assert.equal(JSON.stringify(manifest[key]), JSON.stringify(value));
    }
    assert.match(manifest.version, /^\d+\.\d+\.\d+/);
    assert.equal(manifest.server, undefined);
});

test('plugin still registers, loads its public font and restricts it to Arabic', async () => {
    const {default: manifest} = evaluate('src/manifest.ts');
    let plugin;
    const loadedFaces = [];
    class FontFace {
        constructor(family, source, descriptors) {
            Object.assign(this, {family, source, descriptors});
        }

        async load() {
            return this;
        }
    }
    evaluate('src/index.js', {
        require: (name) => {
            if (name === './manifest') {
                return {__esModule: true, default: manifest};
            }
            assert.equal(name, './style.css');
            return {};
        },
        window: {
            registerPlugin: (id, instance) => {
                assert.equal(id, manifest.id);
                plugin = instance;
            },
        },
        document: {fonts: {add: (face) => loadedFaces.push(face)}},
        FontFace,
        console: {log() {}},
    });
    plugin.initialize({}, {
        getState: () => ({entities: {general: {config: {SiteURL: 'https://example.com/mattermost/'}}}}),
    });
    await Promise.resolve();
    assert.equal(loadedFaces.length, 1);
    assert.equal(loadedFaces[0].family, 'VazirmatnNL');
    assert.ok(loadedFaces[0].source.includes(`https://example.com/mattermost/plugins/${manifest.id}/public/fonts/`));
    assert.ok(loadedFaces[0].descriptors.unicodeRange.includes('U+0600-06FF'));
    assert.ok(fs.existsSync(path.join(root, '../public/fonts/vazirmatn-v33.003/Vazirmatn-NL[wght].woff2')));
});
