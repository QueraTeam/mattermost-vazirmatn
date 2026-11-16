# Mattermost Vazirmatn

This plugin changes Mattermost font to [Vazirmatn](https://github.com/rastikerdar/vazirmatn).

This repository is based on
[mattermost-plugin-starter-template](https://github.com/mattermost/mattermost-plugin-starter-template).

## Installation

Download the plugin file (`ir.quera.mattermost-vazirmatn-*.tar.gz`) from the
[Releases](https://github.com/QueraTeam/mattermost-vazirmatn/releases)
page and upload to your Mattermost  server via **System Console**.

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
