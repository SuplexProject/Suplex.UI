const path = require("path");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");

module.exports = {
    mode: "development",
    entry: ["./src/main.ts"],
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, "dist"),
        library: "SuplexAdmin",
        sourceMapFilename: "Scripts.dist.bundle.js.map" // Because C# project references Scripts.dist.bundle.js
    },

    // Enable sourcemaps for debugging webpack"s output.
    devtool: "source-map",

    resolve: {
        // Add ".ts" and ".tsx" as resolvable extensions.
        extensions: [".webpack.js", ".web.js", ".ts", ".tsx", ".js", ".min.js"],
        modules: [path.resolve(__dirname, "node_modules"), path.resolve(__dirname, "src")],
    },

    module: {
        rules: [
            // All files with a ".ts" or ".tsx" extension will be handled by "awesome-typescript-loader".
            { test: /\.tsx?$/, use: "awesome-typescript-loader" },
        ],
    },

    // plugins: [
    //     new UglifyJsPlugin({
    //         sourceMap: true,
    //         uglifyOptions: {
    //             compress: {
    //                 warnings: false,
    //             },
    //         },
    //     }),
    // ]
    // When importing a module whose path matches one of the following, just
    // assume a corresponding global variable exists and use that instead.
    // This is important because it allows us to avoid bundling all of our
    // dependencies, which allows browsers to cache those libraries between builds.
};

// const path = require("path")
// const UglifyJsPlugin = require("uglifyjs-webpack-plugin")

// module.exports = {
//     mode: "development",
//     entry: "./src/main.js",
//     output: {
//         filename: "bundle.js",
//         path: path.resolve(__dirname, "dist"),
//         library: "SUPLEXUI"
//     },
//     watch: true,
//     // Enable sourcemaps for debugging webpack"s output.
//     devtool: "source-map",

//     plugins: [
//         new UglifyJsPlugin({
//             sourceMap: true,
//             uglifyOptions: {
//                 compress: {
//                     warnings: false
//                 }
//             }
//         })
//     ]

// }
