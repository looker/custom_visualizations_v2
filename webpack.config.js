var path = require('path')

var webpackConfig = {
  entry: {
    hello_world: './src/examples/hello_world/hello_world.js',
    sankey: './src/examples/sankey/sankey.ts',
    liquid_fill_gauge: './src/examples/liquid_fill_gauge/liquid_fill_gauge.ts',
    sunburst: './src/examples/sunburst/sunburst.ts',
    collapsible_tree: './src/examples/collapsible_tree/collapsible_tree.ts',
    chord: './src/examples/chord/chord.ts',
  },
  output: {
    filename: "[name].js",
    path: path.join(__dirname, "dist"),
    library: "[name]",
    libraryTarget: "umd"
  },
  resolve: {
    extensions: [".ts", ".js"]
  },
  module: {
    loaders: [
      { test: /\.ts$/, loader: "ts-loader" }
    ]
  }
}

module.exports = webpackConfig
