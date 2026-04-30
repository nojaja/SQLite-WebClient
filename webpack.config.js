const path = require('path');
const src = path.resolve(__dirname, 'src');
const dist = path.resolve(__dirname, 'dist');
const version = JSON.stringify(require('./package.json').version);
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const { VueLoaderPlugin } = require('vue-loader');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'development' : 'production',
  devtool: 'inline-source-map',
  // 開発サーバーの設定
  devServer: {
    static: {
      directory: dist
    },
    port: 9000,
    compress: true,
    hot: false,
    open: false,
    historyApiFallback: true,
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  },
  entry: {
    'main': './src/js/index.ts'
  },
  target: 'web',
  output: {
    filename: './[name].bundle.js',
    sourceMapFilename: './map/[id].[chunkhash].js.map',
    chunkFilename: './chunk/[id].[chunkhash].js',
    path: dist,
    library: {
      type: 'umd'
    },
    globalObject: 'this'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.vue'],
    // ブラウザ環境の場合、Node.js固有のモジュールに空のモックを提供
    fallback: {
      'buffer': require.resolve("buffer/"),
      'fs': false,
      'path': require.resolve("path-browserify")
    },
    alias: {
      'vue$': 'vue/dist/vue.esm-bundler.js'
    }
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            appendTsSuffixTo: [/\.vue$/]
          }
        },
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader']
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      inject: true,
      chunks: ['main'],
      template: './src/html/index.html',
      filename: './index.html'
    }),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      Buffer: ['buffer', 'Buffer']
    }),
    new CopyPlugin({
      patterns: [
        {
          from: 'node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/',
          to: './',
          globOptions: {
            ignore: ['**/*.js', '**/*.mjs']
          }
        },
        {
          from: 'src/pwa/manifest.webmanifest',
          to: './manifest.webmanifest'
        },
        {
          from: 'src/pwa/service-worker.js',
          to: './service-worker.js'
        },
        {
          from: 'src/assets/pwa/icon-192.png',
          to: './icon-192.png'
        },
        {
          from: 'src/assets/pwa/icon-512.png',
          to: './icon-512.png'
        },
        {
          from: 'src/assets/pwa/apple-touch-icon.png',
          to: './apple-touch-icon.png'
        },
        {
          from: 'src/assets/pwa/favicon.ico',
          to: './favicon.ico'
        }
      ]
    }),
    new MonacoWebpackPlugin({ languages: ['sql'] })
  ]
};