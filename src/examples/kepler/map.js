import React, { Component } from "react"
import { connect } from "react-redux"
import isEqual from "lodash.isequal"
import uniqWith from "lodash.uniqwith"
import normalizeGeojson from "@mapbox/geojson-normalize"
import wktParser from "wellknown"
import { createStore, combineReducers, applyMiddleware, compose } from "redux"
import { taskMiddleware } from "react-palm/tasks"

import KeplerGl from "kepler.gl"
import {
  addDataToMap,
  toggleSidePanel,
  toggleModal,
  inputMapStyle,
  addCustomMapStyle
} from "kepler.gl/actions"
import { processCsvData, processGeojson } from "kepler.gl/processors"
import keplerGlReducer, { combinedUpdaters } from "kepler.gl/reducers"
import "mapbox-gl/dist/mapbox-gl.css"

function mergeGeoJson(inputs) {
  const output = {
    type: "FeatureCollection",
    features: []
  }
  // TODO: rewrite with flatMap?
  for (let i = 0; i < inputs.length; i++) {
    const normalized = normalizeGeojson(inputs[i])
    if (normalized) {
      output.features = [...output.features, ...normalized.features]
      // for (var j = 0; j < normalized.features.length; j++) {
      //   output.features.push(normalized.features[j])
      // }
    }
  }
  return output
}

const reducers = combineReducers({
  keplerGl: keplerGlReducer
})

const composedReducer = (state, action) => {
  switch (action.type) {
    case "@@kepler.gl/ADD_DATA_TO_MAP":
      const processedPayload = {
        ...state,
        keplerGl: {
          ...state.keplerGl,
          map: combinedUpdaters.addDataToMapUpdater(state.keplerGl.map, {
            payload: {
              datasets: action.payload.datasets,
              options: action.payload.options,
              config: action.payload.config
            }
          })
        }
      }
      console.log("processedPayload", processedPayload)
      // We need to do a bit of post-processing here to change Kepler's default behavior
      return {
        ...processedPayload,
        keplerGl: {
          ...processedPayload.keplerGl,
          map: {
            ...processedPayload.keplerGl.map,
            mapState: {
              ...processedPayload.keplerGl.map.mapState,
              // zoom out a bit to fit everything in viewport, but only on first load
              zoom: processedPayload.keplerGl.map.mapStyle.hasOwnProperty(
                "bottomMapStyle"
              )
                ? processedPayload.keplerGl.map.mapState.zoom
                : processedPayload.keplerGl.map.mapState.zoom - 1
            },
            visState: {
              ...processedPayload.keplerGl.map.visState,
              layers: [
                ...processedPayload.keplerGl.map.visState.layers.map(layer => {
                  if (layer.type === "point") {
                    // make sure all of the point layers are shown, even if Kepler hides them
                    layer.config.isVisible = true
                  } else if (layer.type === "geojson") {
                    // remove geojson shape fills, but make stroke thicker
                    layer.config.visConfig.filled = false
                    layer.config.visConfig.thickness = 5
                  }
                  return layer
                })
              ]
            }
          }
        }
      }
  }
  return reducers(state, action)
}

let composeEnhancers = compose
// NOTE: uncomment this to enable Redux Devtools – it's very slow, so off by default
// composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose
export const store = createStore(
  composedReducer,
  {},
  composeEnhancers(applyMiddleware(taskMiddleware))
)

class Map extends Component {
  _updateMapData = () => {
    const {
      config: {
        position_column_strings,
        geojson_column_strings,
        latitude_column_strings,
        longitude_column_strings
      },
      data
    } = this.props

    // It seems Looker sometimes sends data, but not the config in the first `updateAsync` callback
    // But it can also be a problem of invalid entry in the visualization settings
    if (
      !position_column_strings ||
      !geojson_column_strings ||
      !latitude_column_strings ||
      !longitude_column_strings
    ) {
      console.warn(
        "One or more geo column identifier configuration value is missing:",
        {
          position_column_strings,
          geojson_column_strings,
          latitude_column_strings,
          longitude_column_strings
        }
      )
      return
    }

    // We are using CSV as a convenient intermediate format between Looker and Kepler
    // First we process the column headers
    const columnHeaders = Object.keys(data[0])
      .map(column =>
        // Looker native Location data is "lat,lon" format so we need to split the column header
        position_column_strings.some(item => column.includes(item))
          ? [`${column}_lat`, `${column}_lon`].join(",")
          : column
      )
      .join(",")

    // Then the value rows
    const rows = data.map(
      row =>
        `${Object.entries(row)
          .map(([name, cell]) => {
            const { value } = cell
            let parsedValue = value
            if (
              value &&
              geojson_column_strings.some(item => name.includes(item))
            ) {
              // We need to espace GeoJSON column values otherwise they'll be split up
              // See: https://github.com/keplergl/kepler.gl/issues/736#issuecomment-552087721
              parsedValue = `"${value.replace(/"/g, '""')}"`
            } else if (
              !value &&
              position_column_strings.some(item => name.includes(item))
            ) {
              // Null location value needs a comma to prevent it from shifting CSV columns
              parsedValue = ","
            }

            return parsedValue
          })
          .join(",")}\n`
    )
    // Finally we join them all togeter into a big old CSV string
    const dataAsCSV = `${columnHeaders}\n${rows.join("")}`

    // We're using Kepler's own processing tool to generate it's dataset
    const processedCsvData = processCsvData(dataAsCSV)

    // Currently Kepler only takes the first Feature from a GeoJSON, see:
    // https://github.com/keplergl/kepler.gl/blob/master/src/layers/geojson-layer/geojson-utils.js#L134
    // So we need to parse these columns and add them as separate datasets which will show all.
    // First we need to find the indices of columns which are GeoJSON or WKT
    const geoJsonDatasetIndices = []
    processedCsvData.fields.forEach((field, index) => {
      if (field.type === "geojson") {
        geoJsonDatasetIndices.push(index)
      }
    })

    // Then merge the contents of all rows so that we would get all the features in a flat array
    const geoJsonDatasets = geoJsonDatasetIndices.map(index => {
      const geojson_merged = processedCsvData.rows.reduce(
        (previousValue, currentValue) => {
          let parsedGeo
          try {
            parsedGeo = JSON.parse(currentValue[index])
          } catch (e) {}
          if (!parsedGeo) {
            try {
              parsedGeo = wktParser(currentValue[index])
            } catch (e) {}
          }
          if (parsedGeo) {
            // TODO: add row data back into features as metadata
            // TODO: set styling using Look defaults as we don't want fill in ServiceArea polygons,
            // see: https://github.com/keplergl/kepler.gl/blob/ba656d14209f4320818baf06b4240d2ec39486fa/docs/user-guides/b-kepler-gl-workflow/a-add-data-to-the-map.md#2-auto-styling
            return mergeGeoJson([previousValue, parsedGeo])
          }
          return previousValue
        },
        {}
      )

      // Finally we need to remove duplicates to not have stacks of the same thing on the map
      const geojson_merged_deduped = {
        type: "FeatureCollection",
        // TODO: can we do the dedupe on the string representation instead as it's cheaper?
        features: uniqWith(geojson_merged.features, isEqual)
      }

      return {
        info: {
          label: processedCsvData.fields[index].name,
          id: processedCsvData.fields[index].name
        },
        data: processGeojson(geojson_merged_deduped)
      }
    })
    console.log("geoJsonDatasets", geoJsonDatasets)

    // Remove GeoJSON columns from original dataset as we're adding them separately
    const processedCsvDataWithoutGeoJson = {
      fields: processedCsvData.fields.filter(
        (_, index) => !geoJsonDatasetIndices.includes(index)
      ),
      rows: processedCsvData.rows.map(row =>
        row.filter((_, index) => !geoJsonDatasetIndices.includes(index))
      )
    }

    console.log("processedCsvData", processedCsvData)
    console.log(
      "processedCsvDataWithoutGeoJson",
      processedCsvDataWithoutGeoJson
    )

    this.props.dispatch(
      addDataToMap({
        datasets: [
          {
            info: {
              label: "Looker visualization",
              id: "looker_viz"
            },
            data: processedCsvDataWithoutGeoJson
          },
          ...geoJsonDatasets
        ],
        options: {
          centerMap: true,
          readOnly: false
        },
        config: {
          mapStyle: this.props.mapboxStyle
          // visState: {
          //   layerBlending: "subtractive"
          // }
        }
      })
    )
  }

  componentDidMount = () => {
    if (this.props.mapboxStyle["url"]) {
      this.props.dispatch(inputMapStyle(this.props.mapboxStyle))
      this.props.dispatch(addCustomMapStyle())
    }

    // hide the modal & sidepanel on first load
    this.props.dispatch(toggleSidePanel())
    this.props.dispatch(toggleModal())

    this._updateMapData()
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.data.length != prevProps.data.length ||
      !isEqual(this.props.data, prevProps.data) ||
      !isEqual(this.props.config, prevProps.config)
    ) {
      this._updateMapData()
    }
  }

  // TODO: implement calling this.props.configUpdateCallback

  // TODO: load saved config on startup
  // https://github.com/keplergl/kepler.gl/blob/1d503f3c5a832223ea32bf8b26e31f322b124676/docs/api-reference/actions/actions.md#receivemapconfig

  render() {
    return (
      <KeplerGl
        mapboxApiAccessToken={this.props.token}
        id="map"
        width={this.props.width}
        height={this.props.height}
        store={this.props.store}
      />
    )
  }
}

const mapStateToProps = state => {
  return state
}

const dispatchToProps = dispatch => ({ dispatch })

export default connect(mapStateToProps, dispatchToProps)(Map)
