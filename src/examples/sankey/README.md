#  Sankey

![](sankey.png)

This visualization creates a [sankey diagram](https://en.wikipedia.org/wiki/Sankey_diagram), which displays sequences of transitions. Sankey diagrams are a specific type of flow diagram, in which the width of each arrow is proportional to the flow quantity. Sankey diagrams are often used in scientific fields, especially physics. They are used to represent energy inputs, useful outputs, and wasted outputs. Sankeys can also be used to understand how users arrive at and navigate through an application or website.

Good use cases include: 
- Event Analytics
- Energy Flows
- Order Stages

![](sankey.mov)

**Implementation Instructions**
Follow the instructions in [Looker's documentation](https://docs.looker.com/admin-options/platform/visualizations). Note that this viz does not require an SRI hash and has no dependencies. Simply create a unique ID, a label for the viz, and paste in the CDN link below.

**CDN Link** 

Paste the following URL into the "Main" section of your Admin/Visualization page. 

https://looker-custom-viz-a.lookercdn.com/master/sankey.js


**How it works**

Create a Look with any number of dimensions and one measure.

For example, in the sankey diagram above, you can see event transition counts between the various sequences of states.

**More Info**

The Sankey visualization displays the “flow” of data from one dimension to another. This visualization is best used when multiple dimensions are included in the data pane that are related to each other in a hierarchical and sequential way.

A good example use case of this visualization is cost analysis. Accounting may be interested in where exactly the total costs incurred for a given month went. The Sankey graph can show the proportion of dollars that went to different categories and subcategories, in an intuitive way. From left to right, the Sankey graph would start with the total dollar amount of costs incurred for that month, then split into subsequent categories, determined by the second dimension, summed at the appropriate level of granularity. It is best used with relatively high levels of aggregation, as too many categories can clutter the chart and make it difficult to interpret.
