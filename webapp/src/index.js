import manifest from './manifest';
import './style.css';

class MattermostVazirmatnPlugin {
  // eslint-disable-next-line class-methods-use-this
  initialize(registry, store) {
    const state = store.getState();
    const siteURL = (
      state?.entities?.general?.config?.SiteURL || state?.entities?.admin?.config?.ServiceSettings?.SiteURL || ''
    ).replace(/\/$/, '');

    console.log('Initializing mattermost-vazirmatn plugin. SiteURL:', siteURL);

    // Load VazirmatnNL font face
    const fontURL = `${siteURL}/plugins/${manifest.id}/public/fonts/vazirmatn-v33.003/Vazirmatn-NL[wght].woff2`;
    const fontSrc = `url(${fontURL}) format('woff2 supports variations'), url(${fontURL}) format('woff2-variations')`;
    const fontFace = new FontFace('VazirmatnNL', fontSrc, {
      weight: '100 900',
      style: 'normal',
      display: 'swap',
      // Only apply to arabic script.
      // https://en.wikipedia.org/wiki/Arabic_script_in_Unicode
      unicodeRange: 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+0870-089F, U+FB50-FDFF, U+FE70-FEFF, U+1EE00-1EEFF',
    });
    fontFace.load().then((loadedFace) => {
      document.fonts.add(loadedFace);
      console.log('VazirmatnNL font loaded.');
    });
  }
}

window.registerPlugin(manifest.id, new MattermostVazirmatnPlugin());
