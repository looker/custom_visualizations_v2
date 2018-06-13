# Subtotal

![](subtotal.png)

This visualization groups query results by measures and pivots and allows collapsing/expanding of those groups.

**Implementation Instructions**
Follow the instructions in [Looker's documentation](https://docs.looker.com/admin-options/platform/visualizations). Note that this viz does not require an SRI hash and has no dependencies. Simply create a unique ID, a label for the viz, and paste in the CDN link below.

**CDN Link** 

Paste the following URL into the "Main" section of your Admin/Visualization page. 

https://looker-custom-viz-a.lookercdn.com/master/subtotal.js


**How it works**

Create a Look with at least one dimension and one measure.

For example, in the example above, we have grouped products by category and brand and by the year they were ordered. We've also pivoted by department to show the number of orders of those products by department. Row totals appear on the right side of the table.
