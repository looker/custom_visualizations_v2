var path = require('path')

const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

var webpackConfig = {
  entry: {
    hello_world: './src/examples/hello_world/hello_world.js',
    sankey: './src/examples/sankey/sankey.ts',
    liquid_fill_gauge: './src/examples/liquid_fill_gauge/liquid_fill_gauge.ts',
    sunburst: './src/examples/sunburst/sunburst.ts',
    collapsible_tree: './src/examples/collapsible_tree/collapsible_tree.ts',
    chord: './src/examples/chord/chord.ts',
    treemap: './src/examples/treemap/treemap.ts',
    subtotal: './src/examples/subtotal/subtotal.tsx'
  },
  output: {
    filename: '[name].js',
    path: path.join(__dirname, 'dist'),
    library: '[name]',
    libraryTarget: 'umd'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  plugins: [
    new UglifyJSPlugin()
  ],
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
