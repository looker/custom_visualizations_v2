var allVisualizations = [];

module.exports = {
  plugins: {
    visualizations: {
      add: function(vis) {
        allVisualizations.push(vis);
      },
      all: function() {
        return allVisualizations;
      }
    }
  }
}
