import React, { Component } from "react"
import { connect } from "react-redux"
import isEqual from "lodash.isequal"

import KeplerGl from "kepler.gl"
import {
  addDataToMap,
  toggleSidePanel,
  toggleModal,
  fitBounds,
  inputMapStyle,
  addCustomMapStyle
} from "kepler.gl/actions"
import { processCsvData } from "kepler.gl/processors"
import "mapbox-gl/dist/mapbox-gl.css"

class Map extends Component {
  _updateMapData = () => {
    let lngMin = 1000,
      latMin = 1000,
      lngMax = -1000,
      latMax = -1000

    const columnHeaders = Object.keys(this.props.data[0]).join(",")
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
            return value
          })
          .join(",")}\n`
    )
    const dataAsCSV = `${columnHeaders}\n${rows.join("")}`

    this.props.dispatch(
      addDataToMap({
        datasets: [
          {
            info: {
              label: "Kepler visualisation",
              id: "looker_kepler"
            },
            data: processCsvData(dataAsCSV)
          }
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

export default connect(
  mapStateToProps,
  dispatchToProps
)(Map)
