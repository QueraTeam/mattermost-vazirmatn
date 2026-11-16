GO ?= $(shell command -v go 2> /dev/null)
NPM ?= $(shell command -v npm 2> /dev/null)
MM_DEBUG ?=
GO_TEST_FLAGS ?= -race
ASSETS_DIR ?= assets

.PHONY: default
default: all

include build/setup.mk

BUNDLE_NAME ?= $(PLUGIN_ID)-$(PLUGIN_VERSION).tar.gz

ifneq ($(wildcard build/custom.mk),)
include build/custom.mk
endif

# Release helpers from the starter template, adapted to this repository's main branch.
PROTECTED_BRANCH := main
APP_NAME := $(shell basename -s .git `git config --get remote.origin.url`)
DRY_RUN ?=

define bump_version
	@current_branch=$$(git rev-parse --abbrev-ref HEAD); \
	if [ "$$current_branch" != "$(PROTECTED_BRANCH)" ] && ! echo "$$current_branch" | grep -q '^release'; then \
		echo "Error: Tagging is only allowed from $(PROTECTED_BRANCH) or release branches."; exit 1; \
	fi
	@git fetch origin --tags || exit 1; \
	current_branch=$$(git rev-parse --abbrev-ref HEAD); \
	if [ "$$(git rev-parse HEAD)" != "$$(git rev-parse origin/$$current_branch)" ]; then \
		echo "Error: Pull the latest changes before performing a release."; exit 1; \
	fi
	@set -e; \
	version=$$(./build/next-version.sh $(1)); \
	if [ -n "$(DRY_RUN)" ]; then echo "[dry run] Would tag and push $$version"; exit 0; fi; \
	read -p "About to bump $(APP_NAME) to $$version, approve? (y/n) " userinput; \
	if [ "$$userinput" != y ]; then echo "Bump aborted."; exit 1; fi; \
	git tag -s -a "$$version" -m "Bumping $(APP_NAME) to $$version"; \
	git push origin "$$version" || { git tag -d "$$version"; exit 1; }
endef

.PHONY: patch minor major patch-rc minor-rc major-rc
patch minor major patch-rc minor-rc major-rc:
	$(call bump_version,$@)

## Checks the code style, tests, builds and bundles the plugin.
.PHONY: all
all: check-style test dist

## Ensures the plugin manifest is valid.
.PHONY: manifest-check
manifest-check:
	./build/bin/manifest check

## Generates webapp/src/manifest.ts from plugin.json and Git version information.
.PHONY: apply
apply:
	./build/bin/manifest apply

## Installs locked NPM dependencies.
webapp/node_modules: webapp/package.json webapp/package-lock.json webapp/.npmrc
	cd webapp && $(NPM) ci
	touch $@

## Runs ESLint.
.PHONY: check-style
check-style: manifest-check apply webapp/node_modules
	cd webapp && $(NPM) run lint
	$(GO) vet ./build/...

## Builds the webapp.
.PHONY: webapp
webapp: apply webapp/node_modules
ifeq ($(MM_DEBUG),)
	cd webapp && $(NPM) run build
else
	cd webapp && $(NPM) run debug
endif

## Generates an installable plugin archive, including the public font assets.
.PHONY: bundle
bundle dist:
	rm -rf dist/
	mkdir -p dist/$(PLUGIN_ID)
	./build/bin/manifest dist
ifneq ($(wildcard $(ASSETS_DIR)/.),)
	cp -r $(ASSETS_DIR) dist/$(PLUGIN_ID)/
endif
ifneq ($(HAS_PUBLIC),)
	cp -r public dist/$(PLUGIN_ID)/
endif
	mkdir -p dist/$(PLUGIN_ID)/webapp
	cp -r webapp/dist dist/$(PLUGIN_ID)/webapp/
ifeq ($(shell uname),Darwin)
	cd dist && tar --disable-copyfile -czf $(BUNDLE_NAME) $(PLUGIN_ID)
else
	cd dist && tar -czf $(BUNDLE_NAME) $(PLUGIN_ID)
endif
	@echo plugin built at: dist/$(BUNDLE_NAME)

## Builds and bundles the plugin.
.PHONY: dist
dist: manifest-check webapp

## Builds and deploys the plugin to a development server.
.PHONY: deploy
deploy: dist
	./build/bin/pluginctl deploy $(PLUGIN_ID) dist/$(BUNDLE_NAME)

## Rebuilds and deploys the webapp whenever its sources change.
.PHONY: watch
watch: apply webapp/node_modules
ifeq ($(MM_DEBUG),)
	cd webapp && $(NPM) run build:watch
else
	cd webapp && $(NPM) run debug:watch
endif

## Bundles and deploys the latest watch build.
.PHONY: deploy-from-watch
deploy-from-watch: bundle
	./build/bin/pluginctl deploy $(PLUGIN_ID) dist/$(BUNDLE_NAME)

## Runs build-tool and webapp tests.
.PHONY: test test-ci
test: apply webapp/node_modules
	$(GO) test $(GO_TEST_FLAGS) ./build/...
	./build/next-version_test.sh
	cd webapp && $(NPM) test

test-ci: test

## Controls the plugin on a development server.
.PHONY: disable enable reset
disable enable reset:
	./build/bin/pluginctl $@ $(PLUGIN_ID)

## Prints or follows the plugin's server logs.
.PHONY: logs logs-watch
logs logs-watch:
	./build/bin/pluginctl $@ $(PLUGIN_ID)

## Removes generated build artifacts (keeps installed NPM dependencies).
.PHONY: clean
clean:
	rm -rf dist/ webapp/dist/ build/bin/
	rm -f webapp/src/manifest.ts webapp/.eslintcache webapp/junit.xml

## Lists available commands.
.PHONY: help
help:
	@awk '/^## / {description=substr($$0, 4); next} /^[a-zA-Z0-9_-]+.*:/ {if (description) {printf "%-24s %s\n", $$1, description; description=""}}' Makefile
