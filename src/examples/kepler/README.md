# Kepler.gl visualization

This custom Looker visualization integrates the Kepler.gl mapping library, which enables large-scale
visualization of geo-data.

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
