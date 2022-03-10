# Aster Plot for Looker

Aster plots are used to display two metrics per slice in a pie chart visualisation. Each pie slice has a length and width component. 

The first measure, the *length*, represents the **score** of each slice, is the value extending from the centre of the pie outwards to the edge (*0* is the centre and the outer circle length is defaulted to max value of all scores).

The second measure, the *width*, represents the **weight** of each slice, which gets used to arrive at a weighted mean score of the length scores in the centre. This score can also be overriden by entering a custom keyword search to use a row level value's length in place of the weighted mean score. See example below.

This implementation for Looker was built based on the [Ben Best’s Aster Plot in D3 Block](http://bl.ocks.org/bbest/2de0e25d4840c68f2db1).


## Example
![Screenshot](https://github.com/davidtamaki/aster_plot/blob/master/screen-shots/aster_example.gif)


## Implementation Instructions
1. Fork this repository

2. Turn on [GitHub Pages](https://help.github.com/articles/configuring-a-publishing-source-for-github-pages/)

3. Follow directions on Looker's documentation to add a [new custom visualisation manifest](https://docs.looker.com/admin-options/platform/visualizations#adding_a_new_custom_visualization_manifest):
    - In the 'Main' field, the URI of the visualization will be `https://DOMAIN_NAME/aster_plot/aster_plot.js`. For example: https://davidtamaki.github.io/aster_plot/aster_plot.js
    - The required dependencies are:
      - [d3](https://d3js.org/d3.v3.min.js)
      - [d3-tip](https://cdnjs.cloudflare.com/ajax/libs/d3-tip/0.9.1/d3-tip.min.js)
      
