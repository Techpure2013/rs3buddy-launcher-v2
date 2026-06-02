const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");
const webpack = require("webpack");

const isElectron = process.env.BUILD_TARGET === "electron";
const isProduction = process.env.NODE_ENV === "production";

const rendererConfig = {
  name: "renderer",
  context: path.resolve(__dirname, "src"),
  target: isElectron ? "electron-renderer" : "web",
  entry: {
    main: "./app/entrance/index.tsx",
  },
  output: {
    globalObject: "globalThis",
    path: path.resolve(__dirname, "dist"),
    filename: isProduction ? "js/[name].[contenthash:8].js" : "js/[name].bundle.js",
    chunkFilename: isProduction ? "js/[name].[contenthash:8].chunk.js" : "js/[name].chunk.js",
    publicPath: "./",
    clean: true,
  },
  devtool: "source-map",
  mode: isProduction ? "production" : "development",
  devServer: {
    static: { directory: path.resolve(__dirname, "dist") },
    port: 3004,
    host: "127.0.0.1",
    open: true,
    hot: true,
    historyApiFallback: true,
  },
  resolve: {
    mainFields: ["browser", "module", "main"],
    extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
    modules: [path.resolve("./node_modules"), path.resolve("./src")],
    fallback: isElectron ? {} : { fs: false, path: false, child_process: false },
  },
  externals: isElectron
    ? [
        { canvas: "null", sharp: "null" },
        async function ({ request }) {
          const whitelist = ["electron", "electron/common", "electron/renderer", "child_process", "fs", "path", "util"];
          if (whitelist.indexOf(request) !== -1) {
            return `(typeof require != "undefined" ? require("${request}") : null)`;
          }
        },
      ]
    : {},
  optimization: {
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
          name: "vendor-react",
          chunks: "all",
          priority: 40,
        },
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "all",
          priority: 10,
        },
      },
    },
    runtimeChunk: "single",
  },
  module: {
    exprContextCritical: false,
    rules: [
      {
        test: /\.(png|jpg|jpeg|gif|webp|svg)$/i,
        type: "asset/resource",
        generator: { filename: "./assets/images/[name][ext]" },
      },
      {
        test: /\.tsx?$/,
        use: { loader: "ts-loader", options: { transpileOnly: true } },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, { loader: "css-loader", options: { url: false } }],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: "asset/resource",
        generator: { filename: "./assets/fonts/[name][ext]" },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({ __IS_ELECTRON__: JSON.stringify(isElectron) }),
    new MiniCssExtractPlugin({
      filename: isProduction ? "assets/css/[name].[contenthash:8].css" : "assets/css/[name].css",
      chunkFilename: isProduction ? "assets/css/[name].[contenthash:8].chunk.css" : "assets/css/[name].chunk.css",
    }),
    new HtmlWebpackPlugin({
      template: "./app/entrance/index.html",
      filename: "index.html",
      inject: true,
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "public", to: ".", noErrorOnMissing: true },
      ],
    }),
  ],
};

module.exports = rendererConfig;
