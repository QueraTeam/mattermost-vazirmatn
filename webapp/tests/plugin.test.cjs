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

test('hybrid fonts use Mattermost plugin asset paths and clean up without touching host fonts', () => {
    const {default: manifest} = evaluate('src/manifest.ts');
    let plugin;
    const hostFace = {};
    const faces = new Set([hostFace]);
    const styles = new Set();
    const css = fs.readFileSync(path.join(root, 'src/style.css'), 'utf8');
    class FontFace {
        constructor(family, source, descriptors) {
            Object.assign(this, {family, source, descriptors});
        }
    }
    evaluate('src/index.js', {
        require: (name) => {
            if (name === './style.css') {
                return css;
            }
            assert.equal(name, './manifest');
            return {__esModule: true, default: manifest};
        },
        window: {
            registerPlugin: (id, instance) => {
                assert.equal(id, manifest.id);
                plugin = instance;
            },
        },
        document: {
            fonts: faces,
            head: {appendChild: (element) => styles.add(element)},
            createElement: (tag) => {
                assert.equal(tag, 'style');
                return {remove() {styles.delete(this);}};
            },
        },
        FontFace,
        URL,
    });
    plugin.uninitialize();
    const cases = [
        [{entities: {general: {config: {SiteURL: 'https://chat.example'}}}}, ''],
        [{entities: {general: {config: {SiteURL: 'https://chat.example/'}}}}, ''],
        [{entities: {general: {config: {SiteURL: 'https://chat.example/mattermost/'}}}}, '/mattermost'],
        [{entities: {general: {config: {SiteURL: 'https://chat.example/company/chat'}}}}, '/company/chat'],
        [{entities: {admin: {config: {ServiceSettings: {SiteURL: 'https://chat.example/team/'}}}}}, '/team'],
        [{}, ''],
    ];
    for (const [state, subpath] of cases) {
        // Reinitializing also removes any faces registered by the previous initialization.
        plugin.initialize({}, {getState: () => state});
        assert.equal(faces.size, 14);
        assert.equal(styles.size, 1);
        assert.equal([...styles][0].textContent, css);
        const primary = [...faces].filter((face) => face.family === 'VazirmatnNL');
        assert.equal(primary.length, 1);
        assert.equal(primary[0].descriptors.style, 'normal');
        assert.equal(primary[0].descriptors.weight, '100 900');
        const aliases = [...faces].filter((face) => face !== hostFace && face !== primary[0]);
        const combinations = new Set();
        for (const face of aliases) {
            assert.ok(['Open Sans', 'Metropolis'].includes(face.family));
            assert.ok(['300', '400', '600'].includes(face.descriptors.weight));
            assert.ok(['normal', 'italic'].includes(face.descriptors.style));
            assert.equal(face.descriptors.display, 'swap');
            assert.equal(face.descriptors.unicodeRange, 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+0870-089F, U+FB50-FDFF, U+FE70-FEFF, U+1EE00-1EEFF');
            assert.equal(face.source, `url("${subpath}/plugins/${manifest.id}/public/fonts/vazirmatn-v33.003/Vazirmatn-NL[wght].woff2") format("woff2")`);
            combinations.add(`${face.family}/${face.descriptors.weight}/${face.descriptors.style}`);
        }
        assert.equal(combinations.size, 12);
    }
    plugin.uninitialize();
    plugin.uninitialize();
    assert.deepEqual([...faces], [hostFace]);
    assert.equal(styles.size, 0);
    assert.equal(plugin.fontFaces.length, 0);
    assert.equal(plugin.styleElement, null);
    assert.ok(css.includes('.post-message__text'));
    assert.ok(css.includes('.markdown'));
    assert.ok(fs.existsSync(path.join(root, '../public/fonts/vazirmatn-v33.003/Vazirmatn-NL[wght].woff2')));
});
