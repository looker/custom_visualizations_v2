import Map from "./map"
import React from "react"
import ReactDOM from "react-dom"

import { createStore, combineReducers, applyMiddleware } from "redux"
import keplerGlReducer from "kepler.gl/reducers"
import { taskMiddleware } from "react-palm/tasks"

// create store
const store = createStore(
  combineReducers({
    keplerGl: keplerGlReducer
  }),
  {},
  applyMiddleware(taskMiddleware)
)

looker.plugins.visualizations.add({
  // Id and Label are legacy properties that no longer have any function besides documenting
  // what the visualization used to have. The properties are now set via the manifest
  // form within the admin/visualizations page of Looker
  id: "kepler",
  label: "Kepler",
  options: {
    mapbox_token: {
      type: "string",
      label: "Mapbox token",
      placeholder: "pk.eyJ1Ijoi..."
    }
  },
  // Set up the initial state of the visualization
  create: function(element, config) {
    // Insert a <style> tag with some styles we'll use later.
    element.innerHTML = `
      <style>
        html, body, #vis {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
        }
        .mapboxgl-canvas {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
        }
        .hello-world-vis {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
        }
        .hello-world-text-large {
          font-size: 72px;
        }
        .hello-world-text-small {
          font-size: 18px;
        }
      </style>
    `

    // Create a container element to let us center the text.
    let container = element.appendChild(document.createElement("div"))
    container.className = "hello-world-vis"

    // Create an element to contain the text.
    this._targetElement = container.appendChild(document.createElement("div"))

    // Render to the target element
    this.chart = ReactDOM.render(
      <h1 className="hello-world-text-large">Loading...</h1>,
      this._targetElement
    )
  },
  // Render in response to the data or settings changing
  updateAsync: function(data, element, config, queryResponse, details, done) {
    console.log({ data, element, config, queryResponse, details, done })

    // if (!config.mapbox_token) {
    //   this.addError({
    //     title: "Missing Mapbox token",
    //     message:
    //       "Can't render Kepler visualisation without it, please set in the settings."
    //   })
    //   return
    // }

    // Clear any errors from previous updates
    this.clearErrors()

    // Throw some errors and exit if the shape of the data isn't what this chart needs
    if (queryResponse.fields.dimensions.length == 0) {
      this.addError({
        title: "No Dimensions",
        message: "This chart requires dimensions."
      })
      return
    }

    if (data.length == 0) {
      this.addError({
        title: "No Data",
        message: "Can't render Kepler visualisation without data rows."
      })
      return
    }

    // Finally update the state with our new data
    this.chart = ReactDOM.render(
      <Map
        // token={config.mapbox_token}
        token={
          "pk.eyJ1IjoidWJlcmRhdGEiLCJhIjoiY2poczJzeGt2MGl1bTNkcm1lcXVqMXRpMyJ9.9o2DrYg8C8UWmprj-tcVpQ"
        }
        data={data}
        store={store}
        width={element.offsetWidth}
        height={element.offsetHeight}
      />,
      this._targetElement
    )

    // We are done rendering! Let Looker know.
    done()
  }
})
