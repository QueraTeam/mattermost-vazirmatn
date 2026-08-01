import manifest from './manifest';
import './style.css';

class MattermostVazirmatnPlugin {
  // eslint-disable-next-line class-methods-use-this
  initialize(registry, store) {
    try {
      const state = store.getState();
      const siteURL = state?.entities?.general?.config?.SiteURL
        || state?.entities?.admin?.config?.ServiceSettings?.SiteURL || '';

      // Fonts are always fetched in CORS mode, so the font has to come from the
      // page's own origin. SiteURL can name a different one (http vs https, or
      // an internal hostname behind a reverse proxy), so only its path is kept,
      // which is what subpath installations need.
      const subpath = siteURL ? new URL(siteURL, window.location.origin).pathname.replace(/\/+$/, '') : '';
      const fontURL = `${window.location.origin}${subpath}/plugins/${manifest.id}/public/fonts/vazirmatn-v33.003/Vazirmatn-NL[wght].woff2`;
      console.log('[VAZIRMATN] fontURL:', fontURL);

      // The last source is a plain woff2 fallback for browsers that ignore the
      // variable-font format hints and would otherwise skip every source.
      const fontSrc = [
        `url('${fontURL}') format('woff2 supports variations')`,
        `url('${fontURL}') format('woff2-variations')`,
        `url('${fontURL}') format('woff2')`,
      ].join(', ');
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
        console.log('[VAZIRMATN] font loaded, usable for persian text:', document.fonts.check('16px VazirmatnNL', 'سلام'));
      }).catch((err) => {
        console.error('[VAZIRMATN] font failed to load:', err);
      });
    } catch (e) {
      console.error('[VAZIRMATN] initialize() threw an error:', e);
    }
  }
}

window.registerPlugin(manifest.id, new MattermostVazirmatnPlugin());
