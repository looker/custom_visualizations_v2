#  Liquid Fill Gauge

![](liquid_fill_gauge.png)

This diagram displays a liquid fill gauge (LFG), displaying either a single measure value as a percentage, or a comparison of one measure to another measure.

![](liquid_fill_gauge.mov)

**Implementation Instructions**
Follow the instructions in [Looker's documentation](https://docs.looker.com/admin-options/platform/visualizations). Note that this viz does not require an SRI hash and has no dependencies. Simply create a unique ID, a label for the viz, and paste in the CDN link below.

**CDN Link** 

Paste the following URL into the "Main" section of your Admin/Visualization page. 

https://looker-custom-viz-a.lookercdn.com/master/collapsible_tree.js

**How it Works**

Create an explore with one or more measures, and no dimensions. 

**More Info**

If comparing one measure to another measure, the first measure can be displayed as either a percent of the larger measure or the value itself. The visualization represents a thermometer, filling up as the measure gets closer to equivalence with the larger measure (or 100%).

Including any dimensions in the query will either have no effect or will cause the measure to aggregate at a more granular level, in which case the visualization will display the top (in result grid) value of the first measure, compared to the top value of the second measure. Keep in mind, in such cases ordering may affect which row gets displayed.
