import React, { Component } from "react"
import { connect } from "react-redux"
import isEqual from "lodash.isequal"
import normalizeGeojson from "@mapbox/geojson-normalize"

import KeplerGl from "kepler.gl"
import {
  addDataToMap,
  toggleSidePanel,
  toggleModal,
  fitBounds,
  inputMapStyle,
  addCustomMapStyle
} from "kepler.gl/actions"
import { processCsvData, processGeojson } from "kepler.gl/processors"
import "mapbox-gl/dist/mapbox-gl.css"

function mergeGeoJson(inputs) {
  var output = {
    type: "FeatureCollection",
    features: []
  }
  for (var i = 0; i < inputs.length; i++) {
    var normalized = normalizeGeojson(inputs[i])
    if (normalized) {
      for (var j = 0; j < normalized.features.length; j++) {
        output.features.push(normalized.features[j])
      }
    }
  }
  return output
}

class Map extends Component {
  _updateMapData = () => {
    let lngMin = 1000,
      latMin = 1000,
      lngMax = -1000,
      latMax = -1000

    const columnHeaders = Object.keys(this.props.data[0])
      .map(column =>
        column.includes("pos") || column.includes("loc")
          ? [`${column}_lat`, `${column}_lon`].join(",")
          : column
      )
      .join(",")
    const rows = this.props.data.map(
      row =>
        `${Object.entries(row)
          .map(([name, cell]) => {
            const value = cell.value
            // column detection based on https://github.com/keplergl/kepler.gl/blob/master/docs/user-guides/b-kepler-gl-workflow/a-add-data-to-the-map.md#2-layer-detection-based-on-column-names
            // TODO: use https://github.com/keplergl/kepler.gl/blob/master/src/constants/default-settings.js#L236
            // or even https://github.com/keplergl/kepler.gl/blob/master/src/utils/dataset-utils.js#L124
            // TODO: we should also parse Looker native Location columns into lat / lon or Point
            if (value && (name.includes("lat") || name.includes("latitude"))) {
              latMin = Math.min(latMin, parseFloat(value))
              latMax = Math.max(latMax, parseFloat(value))
            } else if (
              value &&
              (name.includes("lng") ||
                name.includes("lon") ||
                name.includes("longitude"))
            ) {
              lngMin = Math.min(lngMin, parseFloat(value))
              lngMax = Math.max(lngMax, parseFloat(value))
            }
            return value && (name.includes("geom") || name.includes("route"))
              ? `"${value.replace(/"/g, '""')}"`
              : value
          })
          .join(",")}\n`
    )
    const dataAsCSV = `${columnHeaders}\n${rows.join("")}`

    const processedData = processCsvData(dataAsCSV)

    console.log("processedData", processedData)

    const geoJsonDatasetIndices = []
    processedData.fields.forEach((field, index) => {
      if (field.type === "geojson") {
        geoJsonDatasetIndices.push(index)
      }
    })

    const geoJsonDatasets = geoJsonDatasetIndices.map(index => {
      const geojson_merged = processedData.rows.reduce(
        (previousValue, currentValue) =>
          mergeGeoJson([previousValue, JSON.parse(currentValue[index])]),
        {}
      )

      return {
        info: {
          label: processedData.fields[index].name,
          id: processedData.fields[index].name
        },
        data: processGeojson(geojson_merged)
      }
    })

    console.log(geoJsonDatasets)

    this.props.dispatch(
      addDataToMap({
        datasets: [
          {
            info: {
              label: "Looker visualization",
              id: "looker_viz"
            },
            data: processedData
          },
          ...geoJsonDatasets
        ],
        options: {
          centerMap: true,
          readOnly: false
        },
        config: {
          mapStyle: this.props.mapboxStyle
        }
      })
    )

    // for some reason we need to pad the bounds to get the right zoom level which shows all points
    const lngDiff = Math.max(Math.abs(lngMax - lngMin), 0.05)
    const latDiff = Math.max(Math.abs(latMax - latMin), 0.05)
    this.props.dispatch(
      fitBounds([
        lngMin - lngDiff * 0.5,
        latMin - latDiff * 0.5,
        lngMax + lngDiff * 0.5,
        latMax + latDiff * 0.5
      ])
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
      !isEqual(this.props.data, prevProps.data)
    ) {
      this._updateMapData()
    }
  }

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
