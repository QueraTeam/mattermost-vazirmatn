// Puts VazirmatnNL first in every font-family Mattermost (and its plugins) declare.
//
// A list of selectors to override goes stale with every Mattermost release: Mattermost
// sets fonts in hundreds of rules ('Open Sans', Metropolis, var(--font-family-body)…),
// many in chunks loaded only when a view opens (the search box, tooltips, menus,
// modals). So every stylesheet's rules are rewritten as they arrive instead.
//
// The VazirmatnNL face only covers the Arabic script (its unicodeRange), so text in
// other scripts keeps the font the rule named, and the user's own choice of font in
// Settings > Display keeps working.

export const FONT = 'VazirmatnNL';

// Families that draw icons, math, code or emoji keep their own font.
const KEEP = /compass-icons|FontAwesome|Glyphicons|KaTeX|monospace|Emoji|Symbola/i;
const KEYWORD = /^(inherit|initial|unset|revert|revert-layer)$/i;

export function withVazirmatn(value) {
  const families = value.trim();
  if (!families || KEYWORD.test(families) || KEEP.test(families)) {
    return null;
  }
  if (families.replace(/^["']/, '').startsWith(FONT)) {
    return null;
  }
  // A var() is left alone here; the custom property it reads is rewritten where it
  // is declared (--font-family-body, --font-family-heading…).
  if (families.startsWith('var(')) {
    return null;
  }
  return `${FONT}, ${families}`;
}

function fixDeclarations(style) {
  const names = ['font-family'];
  for (let i = 0; i < style.length; i += 1) {
    if (style[i].startsWith('--font-family')) {
      names.push(style[i]);
    }
  }
  names.forEach((name) => {
    const value = withVazirmatn(style.getPropertyValue(name));
    if (value) {
      style.setProperty(name, value, style.getPropertyPriority(name));
    }
  });
}

const seen = new WeakSet();

export function fixRule(rule) {
  if (!rule || seen.has(rule)) {
    return;
  }
  seen.add(rule);
  if (rule.style && rule.selectorText !== undefined) {
    fixDeclarations(rule.style);
  }
  // @media, @supports, @layer, @container and nested style rules.
  if (rule.cssRules) {
    Array.from(rule.cssRules).forEach(fixRule);
  }
}

const lengths = new WeakMap();

export function fixSheets() {
  Array.from(document.styleSheets).forEach((sheet) => {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch (e) {
      return; // A cross-origin stylesheet cannot be read.
    }
    if (lengths.get(sheet) === rules.length) {
      return;
    }
    lengths.set(sheet, rules.length);
    Array.from(rules).forEach(fixRule);
  });
}

// Stylesheets arrive as <style>/<link> elements (webpack chunks, plugins) and as rules
// inserted one by one (styled-components and emotion insert into the CSSOM, leaving the
// DOM untouched).
export function watchFonts() {
  fixSheets();

  let pending = false;
  const schedule = () => {
    if (!pending) {
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        fixSheets();
      });
    }
  };
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === 'LINK') {
          node.addEventListener('load', schedule, { once: true });
        }
      });
    });
    schedule();
  });
  observer.observe(document.head, { childList: true, subtree: true, characterData: true });
  observer.observe(document.body, { childList: true });

  const patched = [CSSStyleSheet.prototype, window.CSSGroupingRule && CSSGroupingRule.prototype]
    .filter(Boolean)
    .map((proto) => {
      const { insertRule } = proto;
      // eslint-disable-next-line no-param-reassign
      proto.insertRule = function insertRuleWithVazirmatn(...args) {
        const index = insertRule.apply(this, args);
        try {
          fixRule(this.cssRules[index]);
        } catch (e) {
          // Never break the caller's insert.
        }
        return index;
      };
      return [proto, insertRule];
    });

  return () => {
    observer.disconnect();
    // eslint-disable-next-line no-param-reassign
    patched.forEach(([proto, insertRule]) => { proto.insertRule = insertRule; });
  };
}
