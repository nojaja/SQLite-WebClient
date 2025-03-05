const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  devtool: 'inline-source-map',
  devServer: {
    static: {
      directory: path.join(__dirname, 'docs'),
    },
    compress: true
  },
  entry: './src/js/index.js',
  output: {
    filename: 'main.bundle.js',
    path: path.resolve(__dirname, 'docs'),
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: true,
      chunks: ['main'],
      template: 'src/html/index.html',
      filename: 'index.html'
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
