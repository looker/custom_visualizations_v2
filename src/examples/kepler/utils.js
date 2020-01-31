import { processGeojson } from 'kepler.gl/processors'

const MAX_LATITUDE = 90
const MIN_LATITUDE = -90
const MAX_LONGITUDE = 180
const MIN_LONGITUDE = -180

export function getLayerBounds(layers) {
  // Taken from non-importable utils, see: https://github.com/keplergl/kepler.gl/blob/master/src/utils/data-utils.js#L54
  const availableLayerBounds = layers.reduce((res, l) => {
    if (l.meta && l.meta.bounds) {
      res.push(l.meta.bounds)
    }
    return res
  }, [])
  const newBounds = availableLayerBounds.reduce(
    (res, b) => {
      return [
        Math.min(res[0], b[0]),
        Math.min(res[1], b[1]),
        Math.max(res[2], b[2]),
        Math.max(res[3], b[3]),
      ]
    },
    [MAX_LONGITUDE, MAX_LATITUDE, MIN_LONGITUDE, MIN_LATITUDE],
  )
  const lonDiff = newBounds[0] - newBounds[2]
  const latDiff = newBounds[1] - newBounds[3]
  // NOTE: Kepler zooms in too much so we need to increase the bounds' extent
  // We need a bit more space on longitude max side so that filters can fit on the bottom of viewport
  const extendedBounds = [
    newBounds[0] + lonDiff * 0.6,
    newBounds[1] + latDiff * 1,
    newBounds[2] - lonDiff * 0.6,
    newBounds[3] - latDiff * 0.6,
  ]
  console.log('Recentering viewport around', extendedBounds)
  return extendedBounds
}

export function doesLinestringHaveTimes(feature) {
  const propertyKeys = Object.keys(feature.properties)
  return (
    propertyKeys.some(item => item.includes('start')) &&
    (propertyKeys.some(item => item.includes('duration')) ||
      propertyKeys.some(item => item.includes('end')))
  )
}

export function enrichLinestringFeatureToTrip(feature) {
  let coordinates
  const propertyKeys = Object.keys(feature.properties)
  if (doesLinestringHaveTimes(feature)) {
    try {
      const startDateProperty = propertyKeys.find(item => item.includes('start'))
      const startTimestamp = Date.parse(feature.properties[startDateProperty])
      const durationProperty = propertyKeys.find(item => item.includes('duration'))
      const duration = feature.properties[durationProperty]
      const endDateProperty = propertyKeys.find(item => item.includes('end'))
      const endTimestamp = Date.parse(feature.properties[endDateProperty])
      const tripDuration = duration ? duration * 1000 : endTimestamp - startTimestamp
      coordinates = feature.geometry.coordinates.map((item, index, array) => [
        ...item,
        0,
        Math.round(startTimestamp + (tripDuration / (array.length - 1)) * index),
      ])
    } catch (e) {
      // Well, we tried...
    }
  }
  // We need to create a new object here as mutating would change the original LineString
  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates },
    properties: {
      ...feature.properties,
    },
  }
}

export async function loadGbfsFeedsAsKeplerDatasets(urls) {
  if (!Array.isArray(urls)) {
    console.error('Invalid GBFS feed URLs (should be an Array of Strings):', urls)
    return null
  }

  const datasets = []
  // Using Promise.all to make requests happen in parallel
  await Promise.all(
    urls.map(async (url, index) => {
      try {
        const response = await fetch(url, { cors: true })
        const body = await response.json()
        console.log(`Got GBFS data for ${url}:`, body)
        if (body.hasOwnProperty('data') && body.data.hasOwnProperty('regions')) {
          datasets.push({
            info: {
              label: `Service areas ${body.data.regions[0].name || url}`,
              id: `GBFS_Service_areas_${index}`,
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
                    fillColor: [0, 0, 0, 0],
                    lineColor: [200, 0, 0],
                  },
                }
              }),
            }),
          })
        } else if (body.hasOwnProperty('data') && body.data.hasOwnProperty('stations')) {
          datasets.splice(0, 0, {
            info: {
              label: `Stations ${url}`,
              id: `GBFS_Stations_${index}`,
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
                    fillColor: [0, 0, 0, 0],
                    radius: 30,
                    lineColor: [200, 0, 0],
                    lineWidth: 1,
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
        return null
      }
    }),
  )

  console.log('GBFS datasets', datasets)

  return datasets
}

export function mergeArrayProperties(objValue, srcValue) {
  if (Array.isArray(objValue)) {
    return objValue.concat(srcValue)
  }
}
