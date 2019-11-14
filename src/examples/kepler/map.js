import React, { Component } from "react"
import { connect } from "react-redux"

import KeplerGl from "kepler.gl"
import { addDataToMap, toggleModal } from "kepler.gl/actions"
import { processCsvData } from "kepler.gl/processors"
import "mapbox-gl/dist/mapbox-gl.css"

class Map extends Component {
  componentDidMount = () => {
    try {
      // hide the modal & sidepanel on first load
      // this.props.dispatch(toggleSidePanel())
      this.props.dispatch(toggleModal())

      this.props.dispatch(
        addDataToMap({
          datasets: {
            info: {
              label: "Kepler visualisation",
              id: "looker_kepler"
            },
            data: processCsvData(this.props.dataAsCSV)
          },
          options: {
            centerMap: true,
            readOnly: false
          },
          config: {
            mapStyle: { styleType: "light" }
          }
        })
      )
    } catch (err) {
      console.log("Could not load kepler data", err.message)
    }
  }

  render() {
    return (
      <KeplerGl
        // mint={false}
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
