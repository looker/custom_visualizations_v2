import React, { Component } from 'react'
import { connect } from 'react-redux'
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
} from 'kepler.gl/actions'
import { processCsvData, processGeojson } from 'kepler.gl/processors'
import keplerGlReducer, { combinedUpdaters } from 'kepler.gl/reducers'
import KeplerGlSchema from 'kepler.gl/schemas'

const reducers = combineReducers({
  keplerGl: keplerGlReducer,
})

const configChangeActions = [
  'LAYER_CONFIG_CHANGE',
  'MAP_STYLE_CHANGE',
  'MAP_CONFIG_CHANGE',
  'SET_FILTER',
  'REMOVE_FILTER',
  'ADD_LAYER',
  'REMOVE_LAYER',
]
const nonConfigActions = [
  'redux/INIT',
  'LAYER_HOVER',
  'MOUSE_MOVE',
  'REGISTER_ENTRY',
  'UPDATE_MAP',
  'LAYER_CLICK',
]
let updateLookerConfig
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
      return {
        ...processedPayload,
        keplerGl: {
          ...processedPayload.keplerGl,
          map: {
            ...processedPayload.keplerGl.map,
            mapState: {
              ...processedPayload.keplerGl.map.mapState,
              // zoom out a bit to fit everything in viewport
              zoom: Math.floor(
                processedPayload.keplerGl.map.mapState.zoom -
                  7 / processedPayload.keplerGl.map.mapState.zoom,
              ),
            },
            visState: {
              ...processedPayload.keplerGl.map.visState,
              layers: [
                ...processedPayload.keplerGl.map.visState.layers.map(layer => {
                  if (layer.type === 'point') {
                    // make sure all of the point layers are shown, even if Kepler hides them
                    layer.config.isVisible = true
                  } else if (layer.type === 'geojson') {
                    if (layer.meta.featureTypes.hasOwnProperty('point')) {
                      layer.config.visConfig.stroked = true
                    } else if (layer.meta.featureTypes.hasOwnProperty('polygon')) {
                      layer.config.visConfig.filled = false
                    }
                  }
                  return layer
                }),
              ],
            },
          },
        },
      }
  }
  const updatedState = reducers(state, action)
  if (configChangeActions.some(item => action.type.includes(item))) {
    const configToSave = KeplerGlSchema.getConfigToSave(updatedState.keplerGl.map)
    console.log('configToSave', configToSave)
    updateLookerConfig(btoa(pako.deflate(JSON.stringify(configToSave), { to: 'string' })))
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

function enrichLinestringFeatureToTrip(feature) {
  // If it's a LineString it could be a trip so try to add timestamps to points in it
  if (feature && feature.properties && feature.geometry && feature.geometry.type === 'LineString') {
    const propertyKeys = Object.keys(feature.properties)
    if (
      propertyKeys.some(item => item.includes('start')) &&
      (propertyKeys.some(item => item.includes('duration')) ||
        propertyKeys.some(item => item.includes('end')))
    ) {
      try {
        const startDateProperty = propertyKeys.find(item => item.includes('start'))
        const startTimestamp = Date.parse(feature.properties[startDateProperty])
        const durationProperty = propertyKeys.find(item => item.includes('duration'))
        const duration = feature.properties[durationProperty]
        const endDateProperty = propertyKeys.find(item => item.includes('end'))
        const endTimestamp = Date.parse(feature.properties[endDateProperty])
        const tripDuration = duration ? duration * 1000 : endTimestamp - startTimestamp
        feature.geometry.coordinates = feature.geometry.coordinates.map((item, index, array) => [
          ...item,
          0,
          Math.round(startTimestamp + (tripDuration / (array.length - 1)) * index),
        ])
      } catch (e) {
        // Well, we tried...
      }
    }
  }
  return feature
}

async function loadGbfsFeedsAsKeplerDatasets(urls) {
  if (!Array.isArray(urls)) {
    console.error('Invalid GBFS feed URLs (should be an Array of Strings):', urls)
    return null
  }

  const datasets = []
  // Using Promise.all to make requests happen in parallel
  await Promise.all(
    urls.map(async (url, index) => {
      console.log('Requesting ', url)
      try {
        const response = await fetch(url, { cors: true })
        const body = await response.json()
        console.log('Got GBFS data ', body)
        if (body.hasOwnProperty('data') && body.data.hasOwnProperty('regions')) {
          const datasetId = `GBFS_Service_areas_${index}`
          currentDatasetNames.push(datasetId)
          datasets.push({
            info: {
              label: `Service areas ${body.data.regions[0].name || url}`,
              id: datasetId,
            },
            data: processGeojson({
              type: 'FeatureCollection',
              features: body.data.regions.map(region => {
                const { region_id, geom, ...properties } = region
                return {
                  type: 'Feature',
                  geometry: geom,
                  properties: {
                    ...properties,
                    id: region_id,
                    fillColor: false,
                    lineColor: [200, 0, 0],
                  },
                }
              }),
            }),
          })
        } else if (body.hasOwnProperty('data') && body.data.hasOwnProperty('stations')) {
          const datasetId = `GBFS_Stations_${index}`
          currentDatasetNames.push(datasetId)
          datasets.push({
            info: {
              label: `Stations ${url}`,
              id: datasetId,
            },
            data: processGeojson({
              type: 'FeatureCollection',
              features: body.data.stations.map(station => {
                const { station_id, lat, lon, ...properties } = station
                return {
                  type: 'Feature',
                  // geometry: {
                  //   type: "Polygon",
                  //   coordinates: [h3ToGeoBoundary(geoToH3(lat, lon, 11), true)]
                  // },
                  geometry: {
                    type: 'Point',
                    coordinates: [lon, lat],
                  },
                  properties: {
                    ...properties,
                    id: station_id,
                    lineColor: [200, 200, 200],
                    lineWidth: 5,
                    fillColor: [200, 200, 200],
                    radius: 25,
                  },
                }
              }),
            }),
          })
        } else {
          console.warn(
            'Only "regions" and "stations" GBFS feeds are supported, but got: ',
            body.data,
          )
        }
      } catch (e) {
        console.error('Could not load GBFS feed, error: ', e)
        // TODO: does this fail the promise?
        return null
      }
    }),
  )

  console.log('GBFS datasets', datasets)

  return datasets
}

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

    // Add the GBFS layers separately as we don't want to include them in map bounds calculation
    if (!gbfsDatasets) {
      gbfsDatasets = await loadGbfsFeedsAsKeplerDatasets(gbfsFeeds)
    }
    this.props.dispatch(
      addDataToMap({
        datasets: gbfsDatasets,
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

    let config = {
      mapStyle: this.props.mapboxStyle,
    }
    if (this.props.config.serialisedKeplerMapConfig) {
      const decompressedConfig = JSON.parse(
        pako.inflate(atob(this.props.config.serialisedKeplerMapConfig), {
          to: 'string',
        }),
      )
      console.log('decompressedConfig', decompressedConfig)
      // TODO: need to reconcile ids in datasets: https://github.com/keplergl/kepler.gl/blob/master/docs/api-reference/advanced-usages/saving-loading-w-schema.md#match-config-with-another-dataset
      // config = KeplerGlSchema.load([], decompressedConfig).config
    }

    const lookerDatasetName = 'looker_data'
    currentDatasetNames.push(lookerDatasetName)
    this.props.dispatch(
      addDataToMap({
        datasets: [
          {
            info: {
              label: 'Looker data',
              id: lookerDatasetName,
            },
            data: processedCsvDataWithoutGeoJson,
          },
          ...geoJsonDatasets,
        ],
        options: {
          centerMap: true,
          readOnly: false,
        },
        config,
      }),
    )

    // TODO: add filter if there's a time property – addFilter & enlargeFilter

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
    // We don't want to rerender when the stored Kepler config changes as it'll trash around a lot
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
