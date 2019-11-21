# Kepler.gl visualization

This custom Looker visualization integrates the Kepler.gl mapping library, which enables large-scale
visualization of geo-data.

## Geo data type detection

Currently these are the rules for using various columns as different type of geo data points.

If column name contains a certain substring then it's assumed to be the following geo data type:

- "latitude", "lat" – Latitude float value
- "longitude", "lon", "lon" – Longitude float value
- "pos", "loc" – Latitude + longitude separated with a comma
- "geom", "route" – GeoJSON as string

If these don't cover your use cases the values are exposed as visualization config fields (with the
above values set as default).

## Custom style

To enable a custom Mapbox style, you need to have your own token and style set up already.

Once you do, you can either set them as a global style or individually in a particular Look.

### Global style settings

Go to the Dependencies section in custom visualization settings in Looker and
add these two items:

1. mapbox://styles/xxx/yyy
2. mapboxtoken:pk.eyJ1Ijoixxx.yyy

Make sure that the format is exactly the same as above, as the values will be parsed and if anything
is different the visualization will silently fall back to default.

The reason for using dependencies is that this way it's possible to set the custom style on the
global level, rather than having to do it every time the visualization is chosen.

### Look level style settings

Open the visualization settings in the Look (or Explore) after you chose Kepler by clicking on Edit
and input both the Mapbox token and stlye URL.

## TODO

- Open Drill menu (see https://github.com/looker/custom_visualizations_v2/blob/master/docs/api_reference.md#rendering-data)
- Store Kepler config changes (see https://github.com/looker/custom_visualizations_v2/blob/master/docs/api_reference.md#available-events)
