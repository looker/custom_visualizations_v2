import Map from "./map"
import React from "react"
import ReactDOM from "react-dom"

import { store } from "./map"

looker.plugins.visualizations.add({
  // Id and Label are legacy properties that no longer have any function besides documenting
  // what the visualization used to have. The properties are now set via the manifest
  // form within the admin/visualizations page of Looker
  id: "kepler",
  label: "Kepler",
  options: {
    mapboxToken: {
      type: "string",
      label: "Mapbox token",
      placeholder: "pk.eyJ1Ijoi..."
    },
    mapboxStyle: {
      type: "string",
      label: "Mapbox style URL",
      placeholder: "mapbox://styles/..."
    },
    latitudeColumnStrings: {
      type: "array",
      label: "Latitude column strings",
      default: ["latitude", "lat"]
    },
    longitudeColumnStrings: {
      type: "array",
      label: "Longitude column strings",
      default: ["longitude", "lon", "lng"]
    },
    positionColumnStrings: {
      type: "array",
      label: "Position (lat / lon) column strings",
      default: ["pos", "loc"]
    },
    geojsonColumnStrings: {
      type: "array",
      label: "GeoJSON column strings",
      default: ["geom", "route"]
    },
    keplerMapConfig: {
      type: "string",
      label: "Kepler map config",
      placeholder: "Will be filled as you change map settings",
      default: {}
    },
    gbfsFeeds: {
      type: "array",
      label: "GBFS feeds to load as GeoJSON FeatureCollections",
      placeholder: "List of HTTPS URLs separated with comma",
      default: [
        "https://storage.googleapis.com/gbfs.basis-pdn.bike/BCP/system_regions.json",
        "https://storage.googleapis.com/gbfs.basis-pdn.bike/BCP/station_information.json",
        "https://storage.googleapis.com/gbfs.basis-pdn.bike/Hereford/system_regions.json",
        "https://storage.googleapis.com/gbfs.basis-pdn.bike/Hereford/station_information.json",
        "https://storage.googleapis.com/gbfs.basis-pdn.bike/London/system_regions.json",
        "https://storage.googleapis.com/gbfs.basis-pdn.bike/London/station_information.json"
      ]
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

    let mapboxToken
    let mapboxStyle
    if (config.mapboxToken && config.mapboxStyle) {
      mapboxToken = config.mapboxToken
      mapboxStyle = config.mapboxStyle
    } else {
      try {
        mapboxToken = document
          .querySelector('script[src^="mapboxtoken:"]')
          .src.split(":")[1]
        mapboxStyle = {
          id: "custom_style",
          label: "Custom style",
          url: document.querySelector('script[src^="mapbox://"]').src,
          icon: ""
        }
      } catch (error) {
        console.log(
          "No custom Mapbox token or style set as part of Looker Visualization Dependencies, using default."
        )
        mapboxToken =
          "pk.eyJ1IjoidWJlcmRhdGEiLCJhIjoiY2poczJzeGt2MGl1bTNkcm1lcXVqMXRpMyJ9.9o2DrYg8C8UWmprj-tcVpQ"
        mapboxStyle = { styleType: "light" }
      }
    }

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

    const configUpdateCallback = keplerMapConfig => {
      this.trigger("updateConfig", [{ keplerMapConfig }])
    }

    // Finally update the state with our new data
    this.chart = ReactDOM.render(
      <Map
        mapboxStyle={mapboxStyle}
        token={mapboxToken}
        data={data}
        config={config}
        configUpdateCallback={configUpdateCallback}
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
