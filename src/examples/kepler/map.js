import React, { Component } from 'react'
import { connect } from 'react-redux'
import debounce from 'lodash.debounce'
import isEqual from 'lodash.isequal'
import wktParser from 'wellknown'
import { createStore, combineReducers, applyMiddleware, compose } from 'redux'
import { taskMiddleware } from 'react-palm/tasks'
import 'mapbox-gl/dist/mapbox-gl.css'
import normalizeGeojson from '@mapbox/geojson-normalize'
// import { geoToH3, h3ToGeoBoundary } from "h3-js"
import pako from 'pako'

import KeplerGl from 'kepler.gl'
import {
  addDataToMap,
  removeDataset,
  toggleSidePanel,
  toggleModal,
  inputMapStyle,
  addCustomMapStyle,
  removeLayer,
  fitBounds,
  addFilter,
  setFilter,
} from 'kepler.gl/actions'
import { processCsvData, processGeojson } from 'kepler.gl/processors'
import keplerGlReducer, { combinedUpdaters } from 'kepler.gl/reducers'
import KeplerGlSchema from 'kepler.gl/schemas'

import {
  getLayerBounds,
  enrichLinestringFeatureToTrip,
  loadGbfsFeedsAsKeplerDatasets,
} from './utils'

const reducers = combineReducers({
  keplerGl: keplerGlReducer,
})

const nonConfigActions = [
  'redux/INIT',
  'LAYER_HOVER',
  'MOUSE_MOVE',
  'REGISTER_ENTRY',
  'LAYER_CLICK',
]
let updateLookerConfig = () => false
const debouncedLookerConfigUpdater = debounce((updatedState, action) => {
  const configToSave = KeplerGlSchema.getConfigToSave(updatedState.keplerGl.map)
  console.log('configToSave', new Date(), action.type, configToSave)
  updateLookerConfig(btoa(pako.deflate(JSON.stringify(configToSave), { to: 'string' })))
}, 1000)
const composedReducer = (state, action) => {
  switch (action.type) {
    case '@@kepler.gl/ADD_DATA_TO_MAP':
      const processedPayload = {
        ...state,
        keplerGl: {
          ...state.keplerGl,
          map: combinedUpdaters.addDataToMapUpdater(state.keplerGl.map, {
            payload: {
              datasets: action.payload.datasets,
              options: action.payload.options,
              config: action.payload.config,
            },
          }),
        },
      }
      console.log('ADD_DATA_TO_MAP processed payload', processedPayload)
      // We need to do a bit of post-processing here to change Kepler's default behavior
      processedPayload.keplerGl.map.visState.layers = processedPayload.keplerGl.map.visState.layers.map(
        layer => {
          if (layer.type === 'point') {
            // make sure all of the point layers are shown, even if Kepler hides them
            layer.config.isVisible = true
          }
          return layer
        },
      )
      return processedPayload
  }
  const updatedState = reducers(state, action)
  if (
    !nonConfigActions.some(item => action.type.includes(item)) &&
    updatedState.keplerGl &&
    updatedState.keplerGl.map &&
    updatedState.keplerGl.map.visState
  ) {
    debouncedLookerConfigUpdater(updatedState, action)
  }
  return updatedState
}

let composeEnhancers = compose
// NOTE: uncomment this to enable Redux Devtools – it's very slow, so off by default
// composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose
export const store = createStore(
  composedReducer,
  {},
  composeEnhancers(applyMiddleware(taskMiddleware)),
)

// We're storing dataset names so we can manage data updates better
let currentDatasetNames = []
let gbfsDatasets
class Map extends Component {
  _updateMapData = async () => {
    const {
      config: {
        positionColumnStrings,
        geojsonColumnStrings,
        latitudeColumnStrings,
        longitudeColumnStrings,
        gbfsFeeds,
      },
      data,
    } = this.props

    // It seems Looker sometimes sends data, but not the config in the first `updateAsync` callback
    // But it can also be a problem of invalid entry in the visualization settings
    if (
      !positionColumnStrings ||
      !geojsonColumnStrings ||
      !latitudeColumnStrings ||
      !longitudeColumnStrings
    ) {
      console.warn('One or more geo column identifier configuration value is missing:', {
        positionColumnStrings,
        geojsonColumnStrings,
        latitudeColumnStrings,
        longitudeColumnStrings,
      })
      return
    }

    // Clear up previous datasets, except GBFS as we don't expect that to change
    currentDatasetNames = currentDatasetNames.filter(item => {
      if (!item.includes('GBFS')) {
        this.props.dispatch(removeDataset(item))
        return false
      }
      return true
    })

    // We are using CSV as a convenient intermediate format between Looker and Kepler
    // First we process the column headers
    const columnHeaders = Object.keys(data[0])
      .map(column =>
        // Looker native Location data is "lat,lon" format so we need to split the column header
        positionColumnStrings.some(item => column.includes(item))
          ? [`${column}_lat`, `${column}_lon`].join(',')
          : column,
      )
      .join(',')

    // Then the value rows
    const rows = data.map(
      row =>
        `${Object.entries(row)
          .map(([name, cell]) => {
            const { value } = cell
            let parsedValue = value
            if (value && geojsonColumnStrings.some(item => name.includes(item))) {
              // We need to espace GeoJSON column values otherwise they'll be split up
              // See: https://github.com/keplergl/kepler.gl/issues/736#issuecomment-552087721
              parsedValue = `"${value.replace(/"/g, '""')}"`
            } else if (!value && positionColumnStrings.some(item => name.includes(item))) {
              // Null location value needs a comma to prevent it from shifting CSV columns
              parsedValue = ','
            }

            return parsedValue
          })
          .join(',')}\n`,
    )
    // Finally we join them all togeter into a big old CSV string
    const dataAsCSV = `${columnHeaders}\n${rows.join('')}`

    // We're using Kepler's own processing tool to generate its dataset
    const processedCsvData = processCsvData(dataAsCSV)
    console.log('processedCsvData', processedCsvData)

    // Currently Kepler only takes the first Feature from a GeoJSON, see:
    // https://github.com/keplergl/kepler.gl/blob/master/src/layers/geojson-layer/geojson-utils.js#L134
    // So we need to parse these columns and add them as separate datasets which will show all.
    // First we need to find the indices of columns which are GeoJSON or WKT
    const geoJsonDatasetIndices = []
    processedCsvData.fields.forEach((field, index) => {
      if (field.type === 'geojson') {
        geoJsonDatasetIndices.push(index)
      }
    })

    // Remove GeoJSON columns from original dataset as we're adding them separately
    const processedCsvDataWithoutGeoJson = {
      fields: processedCsvData.fields.filter((_, index) => !geoJsonDatasetIndices.includes(index)),
      rows: processedCsvData.rows.map(row =>
        row.filter((_, index) => !geoJsonDatasetIndices.includes(index)),
      ),
    }
    console.log('processedCsvDataWithoutGeoJson', processedCsvDataWithoutGeoJson)

    // Then merge the contents of all rows so that we would get all the features in a flat array
    const geoJsonDatasets = geoJsonDatasetIndices.map(index => {
      const geojsonMerged = processedCsvData.rows.reduce(
        (previousValue, currentValue, rowIndex) => {
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
            // TODO: set separate styling for each feature type
            // see: https://github.com/keplergl/kepler.gl/blob/ba656d14209f4320818baf06b4240d2ec39486fa/docs/user-guides/b-kepler-gl-workflow/a-add-data-to-the-map.md#2-auto-styling
            // TODO: partition each feature type into their own dataset
            return {
              type: 'FeatureCollection',
              features: [previousValue, parsedGeo].flatMap(item =>
                normalizeGeojson(item).features.map(feature => {
                  if (feature && feature.hasOwnProperty('properties')) {
                    feature.properties = {
                      ...feature.properties,
                      // lineColor: [
                      //   Math.floor(Math.random() * 256),
                      //   Math.floor(Math.random() * 256),
                      //   Math.floor(Math.random() * 256),
                      // ],
                      // We need to add the rest of the data fields to the Feature to show on hover
                      ...processedCsvDataWithoutGeoJson.fields.reduce(
                        (previousValue, currentValue, fieldIndex) => {
                          // But we need to filter out lat / lon columns as those would be rendered
                          if (
                            !latitudeColumnStrings.some(item => currentValue.name.includes(item)) &&
                            !longitudeColumnStrings.some(item => currentValue.name.includes(item))
                          ) {
                            return {
                              ...previousValue,
                              [currentValue.name]:
                                processedCsvDataWithoutGeoJson.rows[rowIndex][fieldIndex],
                            }
                          }
                          return previousValue
                        },
                        {},
                      ),
                    }
                  }
                  return feature
                }),
              ),
            }
          }
          return previousValue
        },
        { type: 'FeatureCollection', features: [] },
      )

      geojsonMerged.features = geojsonMerged.features.map(enrichLinestringFeatureToTrip)

      const datasetName = processedCsvData.fields[index].name
      currentDatasetNames.push(datasetName)
      return {
        info: {
          label: datasetName,
          id: datasetName,
        },
        data: processGeojson(geojsonMerged),
      }
    })
    console.log('geoJsonDatasets', geoJsonDatasets)

    if (!gbfsDatasets) {
      gbfsDatasets = await loadGbfsFeedsAsKeplerDatasets(gbfsFeeds)
      currentDatasetNames.push(gbfsDatasets.map(dataset => dataset.info.id))
    }

    const lookerDatasetName = 'looker_data'
    currentDatasetNames.push(lookerDatasetName)
    const datasetsToAdd = [
      {
        info: {
          label: 'Looker data',
          id: lookerDatasetName,
        },
        data: processedCsvDataWithoutGeoJson,
      },
      ...geoJsonDatasets,
    ]

    let config = {
      mapStyle: this.props.mapboxStyle,
    }
    if (this.props.config.serialisedKeplerMapConfig) {
      const decompressedConfig = JSON.parse(
        pako.inflate(atob(this.props.config.serialisedKeplerMapConfig), {
          to: 'string',
        }),
      )
      const loadedConfig = KeplerGlSchema.parseSavedConfig(decompressedConfig)
      console.log('loaded config', loadedConfig)
      if (loadedConfig.visState.layers.length > 0) {
        config = loadedConfig
      }
    }

    this.props.dispatch(
      addDataToMap({
        datasets: [...datasetsToAdd, ...gbfsDatasets],
        options: {
          centerMap: false,
          readOnly: false,
        },
        config,
      }),
    )

    // We need this workaround until issue is fixed: https://github.com/keplergl/kepler.gl/issues/847
    let ghostLayerIndex
    while (
      (ghostLayerIndex = this.props.keplerGl.map.visState.layers.findIndex(
        layer => layer.dataToFeature && layer.dataToFeature[0] === null,
      )) > -1
    ) {
      this.props.dispatch(removeLayer(ghostLayerIndex))
    }

    // We only want to center the map around non-GBFS layers and only if there's no saved config
    if (!config.hasOwnProperty('mapState')) {
      const nonGbfsLayers = this.props.keplerGl.map.visState.layers.filter(
        layer => !layer.config.dataId.includes('GBFS'),
      )
      if (nonGbfsLayers.length > 0) {
        this.props.dispatch(fitBounds(getLayerBounds(nonGbfsLayers)))
      }
    }

    if (this.props.keplerGl.map.visState.filters.length === 0) {
      // TODO: add filter if there's a time property – addFilter & enlargeFilter
      const timeFields = processedCsvDataWithoutGeoJson.fields.filter(
        field => field.type === 'timestamp',
      )
      if (timeFields.length > 0) {
        this.props.dispatch(addFilter('looker_data'))
        this.props.dispatch(setFilter(0, 'name', timeFields[0].name))
      }
    }

    this.props.lookerDoneCallback()
  }

  componentDidMount = () => {
    console.log('componentDidMount')

    // This needs to be stored in a variable outside of the class as the reducer can't access it
    updateLookerConfig = this.props.configUpdateCallback

    if (this.props.mapboxStyle['url']) {
      this.props.dispatch(inputMapStyle(this.props.mapboxStyle))
      this.props.dispatch(addCustomMapStyle())
    }

    // hide the modal & sidepanel on first load
    this.props.dispatch(toggleSidePanel())
    this.props.dispatch(toggleModal())

    this._updateMapData()
  }

  componentDidUpdate(prevProps) {
    // We don't want to rerender when the stored Kepler config changes as it'd trash around a lot
    const { serialisedKeplerMapConfig: nope, ...newConfigWithoutKeplerConfig } = this.props.config
    const { serialisedKeplerMapConfig: nah, ...prevConfigWithoutKeplerConfig } = prevProps.config
    if (
      this.props.data.length != prevProps.data.length ||
      !isEqual(newConfigWithoutKeplerConfig, prevConfigWithoutKeplerConfig) ||
      !isEqual(this.props.data, prevProps.data)
    ) {
      console.log('componentDidUpdate', 'data or config change detected, reloading...')
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
