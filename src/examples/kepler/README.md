# Kepler.gl visualization

This custom Looker visualization integrates the Kepler.gl mapping library, which enables large-scale
visualization of geo-data.

## Settings in Kepler

Since there are a lot of options for customisation in Kepler on top of the dataset injected into it,
the plugin will auto-save settings like layers, filters, colours, etc so that they are restored when
returning to a saved Look.

That said, there are a few caveats to keep in mind:

- The configuration will be reset when columns change, otherwise some content might be hidden
- The amount of data Looker will store is quite small, so if there are a lot of columns in the data
  or a lot of layers created, etc then it can hit the limit which will break this functionality
- If Kepler behaves strangely after changing things around it's possible to reset the stored config
  by manually deleting the contents of the `Kepler map config` field in the visualization settings
- The map will always recenter around the bounds of the current dataset (instead of saving position)

## Geo data type detection

Currently these are the rules for using various columns as different type of geo data points.

If column name contains a certain string then it's assumed to be the following geo data type:

- "latitude", "lat" – Latitude float value
- "longitude", "lon", "lon" – Longitude float value
- "pos", "loc" – Latitude + longitude separated with a comma
- "geom", "route" – GeoJSON as string

If these don't cover your use cases, the values are exposed as visualization config fields (with the
above values set as default).

There's a fair bit of parsing in this plugin to enhance Kepler's own functionality. While Kepler
would only display the first feature type, here we first normalize into `FeatureCollection` and merge
all types of GeoJSON (and WKT) features, then sort them into separate layers by type. Also, all the
non-GeoJSON columns will be added alongside each GeoJSON features' own properties, which makes it
possible to see all the data from the same data row when hovering overing any feature.

### Trip timestamps

If there are `LineString` features, we'll look for `start` and `end` or `duration` in the names of
properties in the same row or the feature itself and if they are found, try to parse them as date
and use that interval to enrich the points in the `LineString` so that Kepler can animate these as
trips. For more info see [Trip layer in Kepler docs](https://github.com/keplergl/kepler.gl/blob/master/docs/user-guides/c-types-of-layers/k.trip.md#how-to-use-trip-layer-to-animate-path).

This will be added on top of the original LineString features, otherwise it wouldn't be possible to
see all of them displayed at the same time.

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

## GBFS data

It's quite awkward having to include base layers on the map in each row of the Looker dataset itself,
so this plugin will take a comma separated list of URLs of [GBFS feeds](https://github.com/NABSA/gbfs#what-is-gbfs) – currently only `regions` and `station_information` feeds are handled. These will
be displayed underneath the data coming from Looker and excluded from the map bounds calculations.
They are also cached on first load, so won't be reloaded each time the Looker data changes.

## Filters

If there is a timestamp column in the dataset and there are no filters added yet, the plugin will
automatically create a filter based on the first timestamp column. This can of course be removed
in the sidebar.

NOTE: this only works at the moment on the non-GeoJSON Looker dataset. Waiting for this to land: https://github.com/keplergl/kepler.gl/issues/768 so we can apply it to multiple datasets at the same time.

## Future features considered

- Open Drill menu (see https://github.com/looker/custom_visualizations_v2/blob/master/docs/api_reference.md#rendering-data)
