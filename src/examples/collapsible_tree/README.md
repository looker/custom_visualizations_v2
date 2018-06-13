#  Collapsible Tree

![](collapsible-tree.png)

This diagram displays a [treemap](https://en.wikipedia.org/wiki/Tree_structure), showing a hierarchy of a series of dimensions.

![](collapsible-tree.mov)

**Implementation Instructions**
Follow the instructions in [Looker's documentation](https://docs.looker.com/admin-options/platform/visualizations). Note that this viz does not require an SRI hash and has no dependencies. Simply create a unique ID, a label for the viz, and paste in the CDN link below.

**CDN Link** 

Paste the following URL into the "Main" section of your Admin/Visualization page. 

https://looker-custom-viz-a.lookercdn.com/master/collapsible_tree.js

**How it works**

Create a Look with two or more dimensions.

For example, in the collapsible tree diagram featured above, you can see the nested relationship between department, category and brand in an ecommerce catalog.

**More Info**

The minimum requirement for this visualization to work is two dimensions.

The collapsible tree map is best utilized for cases where the user wants to map a lineage of high level to granular data. Visualization will start with one “empty” or blank node (0), and split off into a number of nested the the number of unique records from the first (furthest left) dimension in the explore, each represented by a new node (1).

All subnodes will be collapsed by default and can be expanded by clicking.

