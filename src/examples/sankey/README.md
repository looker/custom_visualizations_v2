#  Sankey


![](sankey.png)

This diagram creates a [sankey diagram](https://en.wikipedia.org/wiki/Sankey_diagram) to display sequences of transitions.

![](sankey.mov)

**How it works**

Create a look with any number of dimensions and one measure.

For example, in the sankey diagram above, you can see event transition counts between the various sequences of states.

**More Info**

The Sankey visualization displays the “flow” of data from one dimension to another. This visualization is best used when multiple dimensions are included in the data pane that are related to each other in a hierarchical and sequential way.

A good example use case of this visualization is cost analysis. Accounting may be interested in where exactly the total costs incurred for a given month went. The Sankey graph can show the proportion of dollars that went to different categories and subcategories, in an intuitive way. From left to right, the Sankey graph would start with the total dollar amount of costs incurred for that month, then split into subsequent categories, determined by the second dimension, summed at the appropriate level of granularity. It is best used with relatively high levels of aggregation, as too many categories can clutter the chart and make it difficult to interpret.