const path = require("path");
const {TsconfigPathsPlugin} = require("tsconfig-paths-webpack-plugin");
const nodeExternals = require("webpack-node-externals");
const envToMode = (env) => {
  if (env.production) {
    return "production";
  }
  return "development";
};
const envToSourceMap = (env) => {
  if (env.production) {
    return false;
  }
  return "source-map";
};

module.exports = env => {
  return {
    entry: {
      preload: "./preload.ts",
      main: "./main.ts",
      'pdfm-web-worker' : "./src-electron/web-worker/pdfm-web-worker.ts"
    },
    output: {
      filename: "[name].js",
      path: path.resolve("./")
    },
    optimization: {
      sideEffects: false,
    },
    target: "electron-renderer",
    mode: envToMode(env),
    node: {
      __dirname: false,
      __filename: false
    },
    resolve: {
      extensions: ['.ts', '.js'],
      plugins: [
        new TsconfigPathsPlugin({
          configFile: "tsconfig-electron.json"
        })
      ]
    },
    externals: [nodeExternals()],
    devtool: envToSourceMap(env),
    module: {
      rules: [
        {
          test: /\.ts$/, loader: 'ts-loader',
          options: {
            configFile: "tsconfig-electron.json"
          }
        }, {
          test: /\.js$/,
          exclude: /(node_modules)/,
          loader: "babel-loader",
          options: {}
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"]
        }
      ]
    }
  };
};
