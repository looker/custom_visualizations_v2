import React, { Component } from 'react'
import { connect } from 'react-redux'
import debounce from 'lodash.debounce'
import isEqual from 'lodash.isequal'
import mergeWith from 'lodash.mergewith'
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
  resetMapConfig,
  addFilter,
  setFilter,
} from 'kepler.gl/actions'
import { processCsvData, processGeojson } from 'kepler.gl/processors'
import keplerGlReducer, { combinedUpdaters } from 'kepler.gl/reducers'
import KeplerGlSchema from 'kepler.gl/schemas'

import {
  GBFS_STATION_ID_PREFIX,
  getLayerBounds,
  doesLinestringHaveTimes,
  enrichLinestringFeatureToTrip,
  loadGbfsFeedsAsKeplerDatasets,
  mergeArrayProperties,
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
  'FIT_BOUNDS',
  'UPDATE_MAP',
  'TOGGLE_MODAL',
  'TOGGLE_SIDE_PANEL',
  'REQUEST_MAP_STYLES',
  'LOAD_MAP_STYLES',
  'LOAD_CUSTOM_MAP_STYLE',
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
      const processedState = {
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
      // We need to do a bit of post-processing here to change Kepler's default behavior
      processedState.keplerGl.map.visState.layers = processedState.keplerGl.map.visState.layers.map(
        (layer) => {
          if (layer.type === 'point') {
            // make sure all of the point layers are shown, even if Kepler hides them
            layer.config.isVisible = true
          } else if (layer.type === 'trip') {
            // make trip trails longer
            layer.config.visConfig.trailLength = 1000
          } else if (layer.type === 'geojson') {
            // make GBFS station stroke enabled by default
            if (layer.config.dataId.includes(GBFS_STATION_ID_PREFIX)) {
              layer.config.visConfig.stroked = true
            }
          }
          return layer
        },
      )
      console.log('ADD_DATA_TO_MAP', 'processedState', processedState)
      debouncedLookerConfigUpdater(processedState, action)
      return processedState
  }
  const updatedState = reducers(state, action)
  // Update saved config except on noisy / irrelevant actions – also debounce to improve performance
  if (
    !nonConfigActions.some((item) => action.type.includes(item)) &&
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

class Map extends Component {
  previousColumnsHeaders = null
  gbfsDatasets = null
  currentGbfsFeeds = null

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

    // We need to wait for the next tick if the Kepler map object is not created yet
    if (
      !this.props.keplerGl ||
      !this.props.keplerGl.hasOwnProperty('map') ||
      !this.props.keplerGl.map.hasOwnProperty('visState')
    ) {
      await new Promise((_) => setTimeout(_, 1))
      this._updateMapData()
      return
    }

    const isNewGbfs = !isEqual(this.currentGbfsFeeds, gbfsFeeds)
    this.currentGbfsFeeds = gbfsFeeds

    // Clear up previous datasets, except GBFS if the feed URLs are the same as before
    Object.keys(this.props.keplerGl.map.visState.datasets)
      .filter((datasetId) => (isNewGbfs ? true : !datasetId.includes('GBFS')))
      .forEach((datasetId) => this.props.dispatch(removeDataset(datasetId)))

    // We are using CSV as a convenient intermediate format between Looker and Kepler
    // First we process the column headers
    const columnHeaders = Object.keys(data[0])
      .map((column) =>
        // Looker native Location data is "lat,lon" format so we need to split the column header
        positionColumnStrings.some((item) => column.split('.').slice(-1)[0].includes(item))
          ? [`${column}_lat`, `${column}_lon`].join(',')
          : column,
      )
      .join(',')

    // Then the value rows
    const rows = data.map(
      (row) =>
        `${Object.entries(row)
          .map(([name, cell]) => {
            const { value } = cell
            let parsedValue = value
            if (
              value &&
              geojsonColumnStrings.some((item) => name.split('.').slice(-1)[0].includes(item))
            ) {
              // We need to escape GeoJSON column values otherwise they'll be split up
              // See: https://github.com/keplergl/kepler.gl/issues/736#issuecomment-552087721
              parsedValue = `${value.replace(/"/g, '""')}`
            } else if (
              !value &&
              positionColumnStrings.some((item) => name.split('.').slice(-1)[0].includes(item))
            ) {
              // Null location value needs a comma to prevent it from shifting CSV columns
              parsedValue = ','
            }

            return positionColumnStrings.some((item) => name.split('.').slice(-1)[0].includes(item))
              ? parsedValue
              : `"${parsedValue}"`
          })
          .join(',')}\n`,
    )
    // Finally we join them all togeter into a big old CSV string
    const dataAsCSV = `${columnHeaders}\n${rows.join('')}`
    console.log('dataAsCSV', dataAsCSV)

    // We're using Kepler's own processing utility to generate its dataset
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
      rows: processedCsvData.rows.map((row) =>
        row.filter((_, index) => !geoJsonDatasetIndices.includes(index)),
      ),
    }
    console.log('processedCsvDataWithoutGeoJson', processedCsvDataWithoutGeoJson)

    // Then merge the contents of all GeoJSON rows and then sort them into datasets by feature type
    const geoJsonDatasets = geoJsonDatasetIndices.flatMap((index) => {
      const geojsonMerged = processedCsvData.rows.reduce((previousRows, currentRow, rowIndex) => {
        let parsedGeo
        try {
          parsedGeo = JSON.parse(currentRow[index])
        } catch (e) {}
        if (!parsedGeo) {
          try {
            parsedGeo = wktParser(currentRow[index])
          } catch (e) {}
        }
        if (parsedGeo) {
          return mergeWith(
            previousRows,
            normalizeGeojson(parsedGeo).features.reduce((previousFeatures, feature) => {
              if (feature && feature.hasOwnProperty('properties')) {
                // We need to add the rest of the data fields to the Feature to show on hover
                Object.assign(
                  feature.properties,
                  processedCsvDataWithoutGeoJson.fields.reduce(
                    (previousFields, currentField, fieldIndex) => {
                      // But we need to filter out lat / lon columns as those would be rendered twice
                      if (
                        !latitudeColumnStrings.some((item) =>
                          currentField.name.split('.').slice(-1)[0].includes(item),
                        ) &&
                        !longitudeColumnStrings.some((item) =>
                          currentField.name.split('.').slice(-1)[0].includes(item),
                        )
                      ) {
                        return {
                          ...previousFields,
                          [currentField.name]:
                            processedCsvDataWithoutGeoJson.rows[rowIndex][fieldIndex],
                        }
                      }
                      return previousFields
                    },
                    {},
                  ),
                )
                return mergeWith(
                  previousFeatures,
                  {
                    // If it's a LineString it could be a trip so try to add timestamps to Points in it
                    ...(feature.geometry.type === 'LineString' &&
                      doesLinestringHaveTimes(feature) && {
                        Trip: [enrichLinestringFeatureToTrip(feature)],
                      }),
                    [feature.geometry.type]: [feature],
                  },
                  mergeArrayProperties,
                )
              }
              return previousFeatures
            }, {}),
            mergeArrayProperties,
          )
        }
        return previousRows
      }, {})

      return Object.entries(geojsonMerged).map(([featureType, features]) => ({
        info: {
          label: `${processedCsvData.fields[index].name}_${featureType}s`,
          id: `${processedCsvData.fields[index].name}_${featureType}s`,
        },
        data: processGeojson({ type: 'FeatureCollection', features }),
      }))
    })
    console.log('geoJsonDatasets', geoJsonDatasets)

    // Load GBFS datasets if we got new feeds
    if (isNewGbfs) {
      this.gbfsDatasets = await loadGbfsFeedsAsKeplerDatasets(gbfsFeeds)
    }

    let config = {
      mapStyle: {
        styleType: this.props.mapboxStyle.hasOwnProperty('id')
          ? this.props.mapboxStyle.id
          : 'light',
      },
    }
    let loadedConfig
    // Let's try to apply the previous config, but we need to reset it if data columns or GBFS feeds
    // have changed to prevent strange behaviour
    if (
      this.props.config.serialisedKeplerMapConfig &&
      (this.previousColumnsHeaders === null || this.previousColumnsHeaders === columnHeaders) &&
      !isNewGbfs
    ) {
      const decompressedConfig = JSON.parse(
        pako.inflate(atob(this.props.config.serialisedKeplerMapConfig), {
          to: 'string',
        }),
      )
      loadedConfig = KeplerGlSchema.parseSavedConfig(decompressedConfig)
      console.log('loaded config', loadedConfig)
      if (loadedConfig.visState.layers.length > 0) {
        config = loadedConfig
      }
    } else {
      this.props.dispatch(resetMapConfig())
    }
    this.previousColumnsHeaders = columnHeaders

    await this.props.dispatch(
      addDataToMap({
        datasets: [
          {
            info: {
              label: 'Looker data',
              id: 'looker_data',
            },
            data: processedCsvDataWithoutGeoJson,
          },
          ...geoJsonDatasets,
          ...this.gbfsDatasets,
        ],
        options: {
          centerMap: false,
          readOnly: false,
        },
        config,
      }),
    )

    // Let's re-center the map around non-GBFS layers
    const nonGbfsLayers = this.props.keplerGl.map.visState.layers.filter(
      (layer) => !layer.config.dataId.includes('GBFS'),
    )
    if (nonGbfsLayers.length > 0) {
      this.props.dispatch(fitBounds(getLayerBounds(nonGbfsLayers)))
    }

    // Let's add filter if there's a timestamp property, but only if there are no filters added yet
    // NOTE: Doesn't apply to GeoJSON layers, waiting for https://github.com/keplergl/kepler.gl/issues/768
    if (!loadedConfig && this.props.keplerGl.map.visState.filters.length === 0) {
      const timeFields = this.props.keplerGl.map.visState.datasets.looker_data.fields.filter(
        (field) => field.type === 'timestamp',
      )
      if (timeFields.length > 0) {
        this.props.dispatch(
          addFilter(
            ['looker_data'],
            // Object.keys(this.props.keplerGl.map.visState.datasets).filter(datasetId =>
            //   this.props.keplerGl.map.visState.datasets[datasetId].fields.some(
            //     field => field.name === timeFields[0].name,
            //   ),
            // ),
          ),
        )
        this.props.dispatch(setFilter(0, 'name', timeFields[0].name))
      }
    }
  }

  componentDidMount = () => {
    // Needs to be stored in a variable outside of the class otherwise the reducer can't access it
    updateLookerConfig = this.props.configUpdateCallback

    if (this.props.mapboxStyle.hasOwnProperty('url')) {
      this.props.dispatch(inputMapStyle(this.props.mapboxStyle))
      this.props.dispatch(addCustomMapStyle())
    }

    // hide the modal & sidepanel on first load
    this.props.dispatch(toggleSidePanel())
    this.props.dispatch(toggleModal())

    this.props.lookerDoneCallback()

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

const mapStateToProps = (state) => {
  return state
}

const dispatchToProps = (dispatch) => ({ dispatch })

export default connect(mapStateToProps, dispatchToProps)(Map)
