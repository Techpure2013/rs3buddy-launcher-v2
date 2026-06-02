const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");
const webpack = require("webpack");

const rendererConfig = {
	name: "renderer",
	context: path.resolve(__dirname, "src"),
	// Always use "web" target - with contextIsolation + sandbox, the renderer
	// has no Node.js APIs. "electron-renderer" breaks stream callbacks.
	target: "web",
	entry: {
		main: "./Entrance/index.tsx",
	},
	output: {
		globalObject: "globalThis",
		path: path.resolve(__dirname, "dist"),
		filename: "js/[name].bundle.js",
		chunkFilename: "js/[name].chunk.js",
		publicPath: "./",
		clean: true,
	},
	devtool: "source-map",
	mode: "development",
	devServer: {
		static: {
			directory: path.resolve(__dirname, "dist"),
		},
		port: 3003,
		host: "127.0.0.1",
		open: true,
		hot: true,
	},
	resolve: {
		mainFields: ["browser", "module", "main"],
		extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
		fallback: {
			fs: false,
			path: false,
			child_process: false,
		},
	},
	externals: {
		canvas: "null",
		sharp: "null",
	},
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
				test: /\.(png|jpg|jpeg|gif|webp)$/i,
				type: "asset/resource",
				generator: {
					filename: "./assets/[name][ext]",
				},
			},
			{
				test: /\.tsx?$/,
				use: {
					loader: "ts-loader",
					options: {
						transpileOnly: true,
					},
				},
				exclude: /node_modules/,
			},
			{
				test: /\.css$/,
				use: [
					MiniCssExtractPlugin.loader,
					{
						loader: "css-loader",
						options: {
							url: false,
						},
					},
				],
			},
			{
				test: /\.scss$/,
				use: [
					MiniCssExtractPlugin.loader,
					{
						loader: "css-loader",
						options: {
							url: true,
						},
					},
					"sass-loader",
				],
			},
			{
				test: /\.glsl$/,
				type: "asset/source",
			},
		],
	},
	plugins: [
		new webpack.DefinePlugin({
			__REACT_DEVTOOLS_GLOBAL_HOOK__: "({ isDisabled: true })",
		}),
		new MiniCssExtractPlugin({
			filename: "assets/css/[name].css",
		}),
		new HtmlWebpackPlugin({
			template: "./Entrance/index.html",
			filename: "index.html",
			inject: true,
		}),
		new webpack.IgnorePlugin({
			resourceRegExp: /^(canvas|electron\/common|sharp)$/,
		}),
		new CopyWebpackPlugin({
			patterns: [
				{ from: "appconfig.prod.json", to: "appconfig.json" },
				{
					from: "appconfig.local.json",
					to: "appconfig.local.json",
					noErrorOnMissing: true,
				},
			],
		}),
	],
};

module.exports = rendererConfig;
