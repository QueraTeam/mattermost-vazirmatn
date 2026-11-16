import manifest from './manifest';
import styles from './style.css';

class MattermostVazirmatnPlugin {
    initialize(registry, store) {
        this.uninitialize();
        const state = store.getState();
        const siteURL = state?.entities?.general?.config?.SiteURL || state?.entities?.admin?.config?.ServiceSettings?.SiteURL || '';
        // Follow Mattermost's documented plugin route pattern: SiteURL pathname + /plugins/<id>.
        const fontURL = `${siteURL ? new URL(siteURL).pathname.replace(/\/+$/, '') : ''}/plugins/${manifest.id}/public/fonts/vazirmatn-v33.003/Vazirmatn-NL[wght].woff2`;
        const source = `url("${fontURL}") format("woff2")`;
        const descriptors = {
            display: 'swap',
            // Only apply to Arabic script.
            // https://en.wikipedia.org/wiki/Arabic_script_in_Unicode
            unicodeRange: 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+0870-089F, U+FB50-FDFF, U+FE70-FEFF, U+1EE00-1EEFF',
        };

        // Only a normal face: text using this family can get browser-synthesized italics.
        this.fontFaces.push(new FontFace('VazirmatnNL', source, {
            ...descriptors,
            weight: '100 900',
            style: 'normal',
        }));

        // Match Mattermost's face descriptors so these extend, rather than replace, its Latin faces.
        // These cover UI rules missed by style.css, including later-loaded views.
        for (const family of ['Open Sans', 'Metropolis']) {
            for (const weight of ['300', '400', '600']) {
                for (const style of ['normal', 'italic']) {
                    this.fontFaces.push(new FontFace(family, source, {
                        ...descriptors,
                        weight,
                        style,
                    }));
                }
            }
        }
        this.fontFaces.forEach((face) => document.fonts.add(face));

        this.styleElement = document.createElement('style');
        this.styleElement.textContent = styles;
        document.head.appendChild(this.styleElement);
    }

    uninitialize() {
        this.fontFaces?.forEach((face) => document.fonts.delete(face));
        this.fontFaces = [];
        this.styleElement?.remove();
        this.styleElement = null;
    }
}

window.registerPlugin(manifest.id, new MattermostVazirmatnPlugin());
