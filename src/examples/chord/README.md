#  Chord

![](chord.png)

This diagram creates a [chord diagram](https://en.wikipedia.org/wiki/Chord_diagram), showing affinity between two dimensions. This is helpful for showing customer paths, market basket analysis, among others.

![](chord.mov)

**How it works**

Create a look with one measure and two dimensions. The order of the dimensions does not really matter as the color will fall with the higher affinity direction.

For example, in the chord diagram featured above, more flights occur from LAX to ORD compared to ORD to LAX, so the chord color is associated with LAX.

Include [chord.js](/chord.js), [utils.js](../common/utils.js) and [d3.v4.js](../common/d3.v4.js)
