var path = require('path')

const ExtraWatchWebpackPlugin = require('extra-watch-webpack-plugin') // XXX
const WebpackNotifierPlugin = require('webpack-notifier') // XXX

var webpackConfig = {
  entry: {
    hello_world: './src/examples/hello_world/hello_world.js',
    sankey: './src/examples/sankey/sankey.ts',
    liquid_fill_gauge: './src/examples/liquid_fill_gauge/liquid_fill_gauge.ts',
    sunburst: './src/examples/sunburst/sunburst.ts',
    collapsible_tree: './src/examples/collapsible_tree/collapsible_tree.ts',
    chord: './src/examples/chord/chord.ts',
    treemap: './src/examples/treemap/treemap.ts',
    subtotal: './src/examples/subtotal/subtotal.js'
  },

  // XXX
  plugins: [
    new WebpackNotifierPlugin(),
    new ExtraWatchWebpackPlugin({
      files: [ 'path/to/file', 'src/**/*.json' ],
      dirs: [ 'path/to/dir' ],
    }),
  ],
  
  output: {
    filename: '[name].js',
    path: path.join(__dirname, 'dist'),
    library: '[name]',
    libraryTarget: 'umd'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  module: {
    loaders: [
      { test: /\.ts$/, loader: "ts-loader" }
    ]
  },
  stats: {
    warningsFilter: /export.*liquidfillgauge.*was not found/
  }
}

module.exports = webpackConfig
