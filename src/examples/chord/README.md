#  Chord

![](chord.png)

This diagram creates a [chord diagram](https://en.wikipedia.org/wiki/Chord_diagram), showing affinity between two dimensions. This is helpful for showing customer paths, market basket analysis, among others.

![](chord.mov)

**How it works**

Create a look with one measure and two dimensions. The order of the dimensions does not really matter as the color will fall with the higher affinity direction.

For example, in the chord diagram featured above, more flights occur from LAX to ORD compared to ORD to LAX, so the chord color is associated with LAX.

**More Info**

The chord visualization is best used with dimensions that have a direct relationship between them. Hovering over a particular relationship between two dimensions will show both the value of the measure for the higher affinity measure as well as the lower affinity measure. In the context of the example above, hovering over the relationship between LAX and ORD will show both the number of flights that have originated in LAX and landed in ORD, and the number of flights that have originated in ORD and landed in LAX.
