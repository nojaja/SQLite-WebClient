const path = require('path');
const src = path.resolve(__dirname, 'src');
const dist = path.resolve(__dirname, 'dist');
const version = JSON.stringify(require('./package.json').version);
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

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
    'main': './src/js/index.js'
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
    // ブラウザ環境の場合、Node.js固有のモジュールに空のモックを提供
    fallback: {
      'crypto': require.resolve("crypto-browserify"),
      'vm': require.resolve("vm-browserify"),
      'buffer': require.resolve("buffer/"),
      'stream': require.resolve("stream-browserify"),
      'fs': false,
      'path': require.resolve("path-browserify")
    }
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: true,
      chunks: ['main'],
      template: './src/html/index.html',
      filename: './index.html'
    }),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery'
    }),
    new CopyPlugin({
      patterns: [
        {
          from: 'node_modules/sql.js/dist/sql-wasm.wasm',
          to: './',
          globOptions: {
            ignore: ['**/*.js', '**/*.mjs']
          }
        }
      ]
    })
  ]
};