const path = require('path');
const src = path.resolve(__dirname, 'src');
const dist = path.resolve(__dirname, 'dist');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'development' : 'production',
  devtool: 'inline-source-map',
  devServer: {
    static: {
      directory: dist
    },
    compress: true
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  },
  entry: {
    'main': './src/js/index.js'
  },
  output: {
    filename: './[name].bundle.js',
    sourceMapFilename: './map/[id].[chunkhash].js.map',
    chunkFilename: './chunk/[id].[chunkhash].js',
    path: dist,
    publicPath:""
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: true,
      chunks: ['main'],
      template: './src/html/index.html',
      filename: './index.html'
    }),
    new CopyPlugin({
      patterns: [
        {
          from: 'node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/',
          to: './',
          globOptions: {
            ignore: ['**/*.js', '**/*.mjs'],
          }
        }
      ],
    }),
  ],
};
