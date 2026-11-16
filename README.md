# Mattermost Vazirmatn

This plugin changes Mattermost font to [Vazirmatn](https://github.com/rastikerdar/vazirmatn).

This repository is based on
[mattermost-plugin-starter-template](https://github.com/mattermost/mattermost-plugin-starter-template).

## Installation

Download the plugin file (`ir.quera.mattermost-vazirmatn-*.tar.gz`) from the
[Releases](https://github.com/QueraTeam/mattermost-vazirmatn/releases)
page and upload to your Mattermost  server via **System Console**.

## How it works

The plugin combines font-face aliases for broad UI coverage with a small
stylesheet for important text and Persian italics.

### Font-face aliases instead of hundreds of selectors

Mattermost uses `Open Sans` and `Metropolis` throughout its UI. Rather than
replacing every `font-family` declaration, the plugin uses the browser's
`FontFace` API to add Vazirmatn faces under those existing family names. Their
`unicodeRange` is restricted to Arabic-script blocks, so Persian/Arabic text
uses Vazirmatn while Latin text keeps Mattermost's original fonts. The aliases
match Mattermost's normal/italic styles and weights 300, 400 and 600: 12 faces
referencing the same bundled variable font, not 12 font files.

This also covers views loaded later, without enumerating their CSS selectors.
A large override stylesheet would be brittle as Mattermost adds or renames
components. A JavaScript DOM watcher would repeatedly inspect new elements and
fight the CSS cascade; it is unnecessary when the browser already handles font
selection. The plugin does not rewrite Mattermost's stylesheets or remove its
fonts. Explicit code and icon font declarations remain untouched. Other font
families, including arbitrary third-party plugin fonts, are not covered by the
aliases.

### Why we still need `style.css`: Persian italics

The bundled Vazirmatn NL font is upright, not a genuine italic font. Registering
it as an `italic` alias tells the browser that it already supplies an italic
face, so the browser renders Persian upright rather than synthesizing a slant.
Simply omitting the italic aliases does not solve this: Mattermost's genuine
Open Sans/Metropolis italic faces still win style matching, and their missing
Persian glyphs fall back elsewhere instead of reliably using Vazirmatn.

The plugin therefore also registers `VazirmatnNL` under its own name, with a
normal variable face (weights 100–900) and no italic face. `webapp/src/style.css`
puts this family first for body text, headings, posts, Markdown and a few
explicit UI font rules. The browser can synthesize Persian italics from that
normal face. Latin characters fall through to Open Sans or Metropolis,
including their genuine italic faces.

This is a deliberate compromise: Persian italic text outside these CSS rules
can still use the upright italic aliases. The stylesheet stays small rather
than promising synthesized italics for every UI component.

### Disable and cleanup

On initialization the plugin adds 13 font faces and one owned style element.
Its `uninitialize()` removes only those resources, leaving Mattermost's fonts
and styles intact. Reinitialization first performs the same cleanup.

## Other Plugins

- [mattermost-rtl](https://github.com/QueraTeam/mattermost-rtl)
- [mattermost-chat-ui](https://github.com/QueraTeam/mattermost-chat-ui)

## Development, Build

Requirements: Go 1.26.10 or newer, Node.js (the version in `.nvmrc`), npm and Make.

```sh
nvm use
make
```

The installable archive is written to `dist/`. Other useful commands:

```sh
make check-style  # Validate the manifest, lint JavaScript and vet the Go build tools.
make test         # Test the build tools, release version helper and webapp bootstrap.
make dist         # Build and bundle without running lint or tests.
make watch        # Rebuild and deploy to a development server on changes.
make help
```

For deployment, set `MM_SERVICESETTINGS_SITEURL` and `MM_ADMIN_TOKEN` (or
`MM_ADMIN_USERNAME`/`MM_ADMIN_PASSWORD`), then run `make deploy`. Local-mode
deployment via `MM_LOCALSOCKETPATH` is also supported.

`plugin.json` is the source of truth for plugin metadata. `make apply` generates
`webapp/src/manifest.ts`; do not edit or commit that file. Versions are derived
from Git tags (`vX.Y.Z`), with commit metadata for development builds. Fetch tags
when building from a shallow clone. The `patch`, `minor`, `major` and corresponding
`*-rc` Make targets create and push signed release tags after confirmation.

### Starter template maintenance

Build tooling is based on
[`mattermost-plugin-starter-template` at `0bb75c8`](https://github.com/mattermost/mattermost-plugin-starter-template/commit/0bb75c86fa1126fd24815278f72fc629c1ef78ca).
This plugin remains webapp-only and JavaScript-only: the template's Go server,
React/Compass demo, TypeScript type checking and Docker integration tests are not
needed. The generated `.ts` manifest contains plain JavaScript. No server binaries
are bundled.
