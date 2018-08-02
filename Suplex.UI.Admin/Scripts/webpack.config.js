const path = require('path')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

module.exports = {
    mode: 'development',
    entry: './src/main.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
        library: 'SUPLEXUI'
    },
    watch: false,
    // Enable sourcemaps for debugging webpack's output.
    devtool: "source-map",

    plugins: [
        new UglifyJsPlugin({
            sourceMap: true,
            uglifyOptions: {
                compress: {
                    warnings: false
                }
            }
        }) 
    ]
    
}
