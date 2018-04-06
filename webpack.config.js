var path = require('path')

var webpackConfig = {
  entry: {
    hello_world: './src/examples/hello_world/hello_world.js',
    sankey: './src/examples/sankey/sankey.ts'
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
      {test: /\.ts$/, loader: "ts-loader"}
    ]
  }
}

module.exports = webpackConfig
