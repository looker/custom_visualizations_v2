// global scope of vis
global.looker = require("./looker_stub")

// test deps
var glob = require("glob")
var path = require("path")
var assert = require("assert")

// Require all visualizations
glob.sync("./dist/*.js").forEach((file) => {
  require(path.resolve(file))
})

looker.plugins.visualizations.all().forEach((vis) => {
  describe(`${vis.label} (as ${vis.id})`, () => {

    it("should load and not use unavailable things", () => {
      // TODO what do we need to assert here
      assert(true)
    });

    it("should implement create", () => {
      assert(typeof vis.create === "function")
    })

    it("should implement update or updateAsync", () => {
      assert(typeof vis.update === "function" || typeof vis.updateAsync === "function")
    })

  })
})
