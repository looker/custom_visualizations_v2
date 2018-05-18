#  Collapsible Tree

![](collapsible-tree.png)

This diagram displays a [treemap](https://en.wikipedia.org/wiki/Tree_structure), showing a hierarchy of a series of dimensions.

![](collapsible-tree.mov)

**How it works**

Create a look with two or more dimensions.

For example, in the collapsible tree diagram featured above, you can see the nested relationship between department, category and brand in an ecommerce catalog.

**More Info**

The collapsible tree map is best utilized for cases where the user wants to map a lineage of high level to granular data. Visualization will start with one “empty” or blank node (0), and split off into a umber of nested the the number of unique records from the first (furthest left) dimension in the explore, each represented by a new node (1). The minimum requirement for this visualization to work is two dimensions.

If there are more than two dimensions, each node from the first set of nodes will then, on click, split into the number of unique records associated with the record from the node that was clicked, again represented by a new set of nodes. This pattern will repeat for every new dimension added to the explore.

Include [collapsible_tree.js](/collapsible_tree.js), [utils.js](../common/utils.js) and [d3.v4.js](../common/d3.v4.js)
  