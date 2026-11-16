const {exec} = require('child_process');
const path = require('path');

const {id: PLUGIN_ID} = require('../plugin.json');
const target = process.env.npm_lifecycle_event;
const isDev = target === 'debug' || target === 'debug:watch';
const plugins = [];

if (target === 'build:watch' || target === 'debug:watch') {
    plugins.push({
        apply: (compiler) => {
            compiler.hooks.afterEmit.tap('AfterEmitPlugin', () => {
                exec('make deploy-from-watch', {cwd: path.resolve(__dirname, '..')}, (err, stdout, stderr) => {
                    if (stdout) {
                        process.stdout.write(stdout);
                    }
                    if (stderr) {
                        process.stderr.write(stderr);
                    }
                    if (err) {
                        console.error('Plugin deployment failed:', err.message);
                    }
                });
            });
        },
    });
}

module.exports = {
    entry: './src/index.js',
    resolve: {
        modules: ['src', 'node_modules'],
        extensions: ['.js', '.ts'],
    },
    module: {
        rules: [
            {test: /\.css$/, type: 'asset/source'},
            {
                test: /\.[jt]s$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {cacheDirectory: true},
                },
            },
        ],
    },
    output: {
        devtoolNamespace: PLUGIN_ID,
        path: path.join(__dirname, 'dist'),
        publicPath: '/',
        filename: 'main.js',
        clean: true,
    },
    mode: isDev ? 'development' : 'production',
    devtool: isDev ? 'eval-source-map' : false,
    plugins,
};
