const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    {ignores: ['dist/**', 'src/manifest.ts']},
    js.configs.recommended,
    {
        files: ['**/*.js', '**/*.cjs'],
        rules: {
            'class-methods-use-this': 'error',
            eqeqeq: 'error',
            indent: ['error', 4],
            quotes: ['error', 'single', {avoidEscape: true}],
            semi: ['error', 'always'],
        },
    },
    {
        files: ['src/**/*.js'],
        languageOptions: {globals: globals.browser},
    },
    {
        files: ['*.js', '*.cjs', 'tests/**/*.cjs'],
        languageOptions: {globals: globals.node},
    },
];
