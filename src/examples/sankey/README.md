#  Sankey


![](sankey.png)

This visualization creates a [sankey diagram](https://en.wikipedia.org/wiki/Sankey_diagram), which displays sequences of transitions. Sankey diagrams are a specific type of flow diagram, in which the width of each arrow is proportional to the flow quantity. Sankey diagrams are often used in scientific fields, especially physics. They are used to represent energy inputs, useful outputs, and wasted outputs. Sankeys can also be used to understand how users arrive at and navigate through an application or website.

Good use cases include: 
- Event Analytics
- Energy Flows
- Order Stages

![](sankey.mov)

**How it works**

Create a Look with any number of dimensions and one measure.

For example, in the sankey diagram above, you can see event transition counts between the various sequences of states.

## Manifest
id: sankey,
label: Sankey,
Main: sankey.js
Dependencies: https://cdnjs.cloudflare.com/ajax/libs/d3-sankey/0.7.1/d3-sankey.min.js, https://cdnjs.cloudflare.com/ajax/libs/d3/4.13.0/d3.min.js
