#  Sunburst

![](sunburst.png)

This diagram creates a [sunburst](https://en.wikipedia.org/wiki/Pie_chart#Ring_chart_.2F_Sunburst_chart_.2F_Multilevel_pie_chart) to display hierarchical data in a nested structure.

![](sunburst.mov)

**How it works**

Create a look with any amount of dimensions and one measure.

For example, in the sunburst featured above, you can see event counts by the hierarchical sequence of events.

Include [sunburst.js](/sunburst.js), [utils.js](../common/utils.js), and [d3.v4.js](../common/d3.v4.js)

**More Info** 

The sunburst chart is represented by one ore more complete and partial circles, or donuts. The inner-most donut is always complete. Subsequent donuts can be complete or fragmented, depending on the presence of data within the first donuts’ categories. For example, the first donut may have three categories: completed orders, returned orders, and incomplete orders. On a given day the second donut may include data for both the returned and completed orders, but no data for incomplete orders. The second donut would then be fragmented, represented by a missing section over the first part of the donut representing incomplete orders. 

The sunburst visualization is meant to display data across two or more dimensions. Similar to a collapsible tree, it is best used when comparing data across increasing levels of granularity. There is no limit to the number of dimensions that can be used, but the graph becomes difficult to understand and trace with an overabundance of dimensions. The same issues arise with overly granular data. One category in the first donut that has 50 subcategories associated with it will be difficult to read. 
