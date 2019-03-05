// global scope of vis
global.looker = require("./looker_stub")

// Fix jQuery for anything that needs it
var jsdom = require("jsdom")
global.window = new jsdom.JSDOM().window
global.$ = require("jquery")(global.window)

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

    test("should load and not use unavailable things", () => {
      // TODO what do we need to assert here
      assert(true)
    });

    test("should have a valid ID", () => {
      assert(/^\w+$/.test(vis.id))
    })

    test("should have a label", () => {
      assert(/\S/.test(vis.label))
    })

    test("should implement create", () => {
      assert(typeof vis.create === "function")
    })

    test("should implement update or updateAsync", () => {
      assert(typeof vis.update === "function" || typeof vis.updateAsync === "function")
    })

  })
})
