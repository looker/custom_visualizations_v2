looker.plugins.visualizations.add({
  //plot and series (colors)
  options: {
    radius: {
      section: "Data",
      order: 1,
      type: "number",
      label: "Circle Radius"
    },
    keyword_search: {
      section: "Data",
      order: 2,
      type: "string",
      label: "Custom keyword to search for",
      placeholder: "Enter row value to display score"
    },
    label_value: {
      section: "Data",
      order: 3,
      type: "string",
      label: "Data Labels",
      values: [
        {"On":"on"},
        {"Off":"off"}
        ],
      display: "radio",
      default: "off"
    },
    legend: {
      section: "Data",
      order: 4,
      type: "string",
      label: "Legend",
      values: [
        { "Left": "left" },
        { "Right": "right" },
        { "Off": "off"}
      ],
      display: "radio",
      default: "off"
    },
    color_range: {
      section: "Format",
      order: 1,
      type: "array",
      label: "Color Range",
      display: "colors",
      default: ["#9E0041", "#C32F4B", "#E1514B", "#F47245", "#FB9F59", "#FEC574", "#FAE38C", "#EAF195", "#C7E89E", "#9CD6A4", "#6CC4A4", "#4D9DB4", "#4776B4", "#5E4EA1"]
    },
    chart_size: {
      section: "Format",
      order: 2,
      type: "string",
      label: "Chart Size",
      default: '100%'
    },
    inner_circle_color: {
      section: "Inner Circle",
      order: 1,
      type: "string",
      label: "Circle Color",
      display: "color",
      default: "#ffffff"
    },
    text_color: {
      section: "Inner Circle",
      order: 2,
      type: "string",
      label: "Text Color",
      display: "color",
      default: "#000000"
    },
    font_size: {
      section: "Inner Circle",
      order: 3,
      type: "number",
      label: "Font Size",
      display: "range",
      min: 10,
      max: 100,
      default: 40
    }
  },

  // Set up the initial state of the visualization
  create: function(element, config) {

    var css = `
      <style>
        body {
      font: 10px sans-serif;
    }

    .axis path,
    .axis line {
      fill: none;
      stroke: #000;
      shape-rendering: crispEdges;
    }

    .bar {
      fill: orange;
    }

    .solidArc:hover {
      fill: orangered ;
    }

    .solidArc {
        -moz-transition: all 0.3s;
        -o-transition: all 0.3s;
        -webkit-transition: all 0.3s;
        transition: all 0.3s;
    }

    .x.axis path {
      display: none;
    }

    .aster-score {
      line-height: 1;
      font-weight: bold;
    }

    .d3-tip {
      line-height: 1;
      font-weight: bold;
      padding: 12px;
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      border-radius: 2px;
    }

    /* Creates a small triangle extender for the tooltip */
    .d3-tip:after {
      box-sizing: border-box;
      display: inline;
      font-size: 10px;
      width: 100%;
      line-height: 1;
      color: rgba(0, 0, 0, 0.8);
      content: "\\25BC";
      position: absolute;
      text-align: center;
    }

    /* Style northward tooltips differently */
    .d3-tip.n:after {
      margin: -1px 0 0 0;
      top: 100%;
      left: 0;
    }

    .legend rect {
      fill:white;
      stroke:black;
      opacity:0.8;
    }

      </style> `;

    element.innerHTML = css;
    var container = element.appendChild(document.createElement("div")); // Create a container element to let us center the text.
    this.container = container
    container.className = "d3-aster-plot";
    this._textElement = container.appendChild(document.createElement("div")); // Create an element to contain the text.
  },


  // Render in response to the data or settings changing
  updateAsync: function(data, element, config, queryResponse, details, done) {
    this.container.innerHTML = '' // clear container of previous vis
    this.clearErrors(); // clear any errors from previous updates

    // ensure data fit - requires no pivots, exactly 1 dimension_like field, and exactly 2 measure_like fields
    if (!handleErrors(this, queryResponse, {
      min_pivots: 0, max_pivots: 0,
      min_dimensions: 1, max_dimensions: 1,
      min_measures: 2, max_measures: 2})) {
      return;
    }

    var dimension = queryResponse.fields.dimension_like[0].name;
    var measure_1_score = queryResponse.fields.measure_like[0].name, measure_2_weight = queryResponse.fields.measure_like[1].name;

    // SVG margins to make labels visible. Otherwise they overflow visible area
    // src: https://www.visualcinnamon.com/2015/09/placing-text-on-arcs.html
    var margin = {
      top: 30,
      right: 30,
      bottom: 30,
      left: 30
    };

    var width = element.clientWidth - margin.left - margin.right,
      height = element.clientHeight - margin.top - margin.bottom,
      radius = Math.min(width, height) / 2,
      innerRadius = 0.3 * radius;

    // set custom chart size
    if (!isNaN(parseFloat(config.chart_size))) {
      var ratio = parseFloat(config.chart_size) / 100.0;
      if (ratio > 2) {
        radius = radius*2;
      }
      else if (ratio < 0.2) {
        radius = radius*0.2;
      }
      else {
        radius = radius*ratio;
      }
    }

    if (!config.color_range) {
      config.color_range = ["#9E0041", "#C32F4B", "#E1514B", "#F47245", "#FB9F59", "#FEC574", "#FAE38C", "#EAF195", "#C7E89E", "#9CD6A4", "#6CC4A4", "#4D9DB4", "#4776B4", "#5E4EA1"];
    }

    var all_scores = [],
      all_weight = [],
      color_length = config.color_range.length,
      dataset_tiny = {};
    for (let i = 0; i < data.length; i++) {
      if (i >= color_length) {
        let j = Math.floor(i/color_length)
        data[i].color = config.color_range[i-(j*color_length)]; // loop through color array if there are too many series
      } else {
        data[i].color = config.color_range[i];
      }
      data[i].label = data[i][dimension].value; // dimension label
      data[i].score = +data[i][measure_1_score].value; // length of slice (circle radius default is 100)
      data[i].weight = +data[i][measure_2_weight].value; // angle of slice (width of slice)
      data[i].width = +data[i][measure_2_weight].value; // angle of slice (width of slice)
      data[i].rendered = data[i][measure_1_score].rendered; // used for tooltip and legened
      all_scores.push(data[i][measure_1_score].value); // used to set max radius
      all_weight.push(data[i][measure_2_weight].value); // used to set custom inner circle size
      dataset_tiny[data[i][dimension].value] = data[i][measure_1_score].rendered;
    }

    if (!config.radius) {
      console.log('Radius not set. Defaulting to max score: ' + getMaxOfArray(all_scores))
      config.radius = getMaxOfArray(all_scores)
    } else {
      console.log('Radius config set to: ' + config.radius)
    }

    // calculate the weighted mean score (value in centre of pie)
    if (!config.keyword_search) {
      // console.log('Default weighted mean score')
      var score =
        Math.round(
          data.reduce(function(a, b) {
            //console.log('a:' + a + ', b.score: ' + b.score + ', b.weight: ' + b.weight);
            return a + (b.score * b.weight);
          }, 0) /
          data.reduce(function(a, b) {
            return a + b.weight;
          }, 0)
        );
    } else {
      // custom keyword option
      for (let i = 0; i < data.length; i++) {
        if (data[i].label.toLowerCase().includes(config.keyword_search.toLowerCase())) {
          console.log(data[i].label + ' is used for centre score');
          var score = data[i].weight,
            min = Math.min( ...all_weight),
            max = Math.max( ...all_weight),
            scale_min = 0.2, // setting scale is 0.2 -> 0.6 of radius
            scale_max = 0.6,
            diff = max-min,
            percentile = (score-min)/diff;
          data.splice(i,1);
          innerRadius = ((percentile * 0.4) + scale_min) * radius; // reshape inner circle size based on weight
          break;
        }
      }
    }

    var pie = d3.layout.pie()
      .sort(null)
      .value(function(d) {
        return d.width;
      });

    var tip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([0, 0])
      .html(function(d) {
        return d.data.label + ": <span style='color:orangered'>" + d.data.rendered + "</span>";
      });

    var arc = d3.svg.arc()
      .innerRadius(innerRadius)
      .outerRadius(function(d) {
        return (radius - innerRadius) * (d.data.score / (1.0*config.radius)) + innerRadius;
      });

    var outlineArc = d3.svg.arc()
      .innerRadius(innerRadius)
      .outerRadius(radius);

    var svg = d3.select(".d3-aster-plot").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + (width / 2 + margin.left) + "," + (height / 2 + margin.top) + ")");

    svg.call(tip);

    // inner circle color
    var inner_circle = svg.append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", innerRadius)
      .attr("fill",config.inner_circle_color);

    // affix score to centre of pie
    svg.append("svg:text")
      .attr("class", "aster-score")
      .attr("dy", ".35em")
      .attr("text-anchor", "middle") // text-align: right
      .style('fill', config.text_color)
      .attr("font-size", config.font_size)
      .text(score);

    var path = svg.selectAll(".solidArc")
      .data(pie(data))
      .enter().append("path")
      .attr("data-legend",function(d) { return d.data.label }) // for legend
      .attr("fill", function(d) { return d.data.color })
      .attr("class", "solidArc")
      .attr("stroke", "gray")
      .attr("d", arc)
      .on('mouseover', tip.show)
      .on('mouseout', tip.hide);

    // Create the Ouline Arc and also the invisible arcs for labels
    // src: https://www.visualcinnamon.com/2015/09/placing-text-on-arcs.html
    var outerPath = svg.selectAll(".outlineArc")
      .data(pie(data))
      .enter().append("path")
      .attr("fill", "none")
      .attr("stroke", "gray")
      .attr("class", "outlineArc")
      .attr("d", outlineArc)
      // Create the new invisible arcs and flip the direction for the bottom half labels
      .each(function(d, i) {
          // Search pattern for everything between the start and the first capital L
          var firstArcSection = /(^.+?)L/;

          // Grab everything up to the first Line statement
          var newArc = firstArcSection.exec( d3.select(this).attr("d") )[1];
          // Replace all the commas so that IE can handle it
          newArc = newArc.replace(/,/g , " ");

          if (shouldFlipLabel(d.startAngle, d.endAngle)) {
              // Arc path
              // Template: M start-x, start-y A radius-x, radius-y, x-axis-rotation, large-arc-flag, sweep-flag, end-x, end-y
              // Example: M 0 300 A 200 200 0 0 1 400 300

              // Everything between the capital M and first capital A
              var startLoc = /M(.*?)A/;
              // Everything between the capital A and 0 0 1
              var middleLoc = /A(.*?)0 0 1/;
              // Everything between the 0 0 1 and the end of the string (denoted by $)
              var endLoc = /0 0 1 (.*?)$/;
              // Flip the direction of the arc by switching the start and end point
              // and using a 0 (instead of 1) sweep flag
              var newStart = endLoc.exec( newArc )[1];
              var newEnd = startLoc.exec( newArc )[1];
              var middleSec = middleLoc.exec( newArc )[1];

              // Build up the new arc notation, set the sweep-flag to 0
              newArc = "M" + newStart + "A" + middleSec + "0 0 0 " + newEnd;
          }

          // Create a new invisible arc that the label can flow along
          svg.append("path")
              .attr("class", "hiddenDonutArcs")
              .attr("id", "sliceOutlineArc_"+i)
              .attr("d", newArc)
              .style("fill", "none");
      });

    if (config.label_value == "on") {
      // Create labels
      // src: https://www.visualcinnamon.com/2015/09/placing-text-on-arcs.html

      // Line 1
      svg.selectAll(".label-line-1")
        .data(pie(data))
        .enter()
        .append("text")
        .attr("class", "label-line-1")
        // Move the labels below the arcs
        .attr("dy", function(d,i) {
          return shouldFlipLabel(d.startAngle, d.endAngle)
            ? 18
            : -21
        })
        .append("textPath")
        .attr("startOffset","50%")
        .style("text-anchor","middle")
        .attr("xlink:href", function(d, i) { return "#sliceOutlineArc_"+i; })
        .text(function(d) { return d.data.label; });

      // Line 2
      svg.selectAll(".label-line-2")
        .data(pie(data))
        .enter()
        .append("text")
        .attr("class", "label-line-2")
        // Move the labels below the arcs
        .attr("dy", function(d,i) {
          return shouldFlipLabel(d.startAngle, d.endAngle)
            ? 28
            : -11
        })
        .append("textPath")
        .attr("startOffset","50%")
        .style("text-anchor","middle")
        .attr("xlink:href", function(d, i) { return "#sliceOutlineArc_"+i; })
        .text(function(d) { return d.data.rendered; });
    }

    // legend
    if (config.legend == "left") {
      applyLegend(-width/2.2)
    } else if (config.legend == "right") {
      applyLegend(width/3.0)
    }


    // Helper functions

    // Flip the end and start position
    //
    // We do not flip slices that more than 180 to not think about condition of how to flip
    // them. Custom condition is required because > 180 slices have "large-arc-flag" set to 1,
    // but we handle only case when it's set to 0 (Look at "0 0 1")
    function shouldFlipLabel(startAngle, endAngle) {
      return (
        // End angle lies beyond a quarter of a circle (90 degrees or pi/2)
        radiansToDegrees(endAngle) > 90 &&
        radiansToDegrees(endAngle) < 270 &&
        // Slice "length" is less than 180 degrees
        radiansToDegrees(endAngle - startAngle) < 180
      );
    }

    function radiansToDegrees(ragiansAngle) {
      return ragiansAngle * 180 / Math.PI;
    }

    function getMaxOfArray(numArray) {
       return Math.max.apply(null, numArray);
    }

    function handleErrors(vis, res, options) {
      var check = function (group, noun, count, min, max) {
          if (!vis.addError || !vis.clearErrors) {
              return false;
          }
          if (count < min) {
              vis.addError({
                  title: "Not Enough " + noun + "s",
                  message: "This visualization requires " + (min === max ? 'exactly' : 'at least') + " " + min + " " + noun.toLowerCase() + (min === 1 ? '' : 's') + ".",
                  group: group
              });
              return false;
          }
          if (count > max) {
              vis.addError({
                  title: "Too Many " + noun + "s",
                  message: "This visualization requires " + (min === max ? 'exactly' : 'no more than') + " " + max + " " + noun.toLowerCase() + (min === 1 ? '' : 's') + ".",
                  group: group
              });
              return false;
          }
          vis.clearErrors(group);
          return true;
      };
      var _a = res.fields, pivots = _a.pivots, dimensions = _a.dimension_like, measures = _a.measure_like;
      return (check('pivot-req', 'Pivot', pivots.length, options.min_pivots, options.max_pivots)
          && check('dim-req', 'Dimension', dimensions.length, options.min_dimensions, options.max_dimensions)
          && check('mes-req', 'Measure', measures.length, options.min_measures, options.max_measures));
    }

    function applyLegend(horizontalScale) {
      var legend = svg.append("g")
        .attr("class","legend")
        .attr("transform","translate(" + horizontalScale + " ,-" + height/2.5 + ")")
        .style("font-size","12px")
        .call(d3legend)
    }

    // Legend
    // (C) 2012 ziggy.jonsson.nyc@gmail.com
    // MIT licence
    function d3legend(g) {
      g.each(function() {
        var g= d3.select(this),
            items = {},
            svg = d3.select(g.property("nearestViewportElement")),
            legendPadding = g.attr("data-style-padding") || 5,
            lb = g.selectAll(".legend-box").data([true]),
            li = g.selectAll(".legend-items").data([true])

        lb.enter().append("rect").classed("legend-box",true)
        li.enter().append("g").classed("legend-items",true)

        svg.selectAll("[data-legend]").each(function() {
            var self = d3.select(this)
            items[self.attr("data-legend")] = {
              pos : self.attr("data-legend-pos") || this.getBBox().y,
              color : self.attr("data-legend-color") != undefined ? self.attr("data-legend-color") : self.style("fill") != 'none' ? self.style("fill") : self.style("stroke"),
              rendered : '100' // testing adding values to legend
            }
          })

        // sort alphanumerically
        items = d3.entries(items).sort(function(a,b) { return (a.key < b.key) ? -1 : (a.key > b.key) ? 1 : 0})

        // adding rendered values to legend
        for (let i = 0; i < items.length; i++) {
          items[i].value.rendered = dataset_tiny[items[i].key]
        }

        li.selectAll("text")
            .data(items,function(d) { return d.key})
            .call(function(d) { d.enter().append("text")})
            .call(function(d) { d.exit().remove()})
            .attr("y",function(d,i) { return i+"em"})
            .attr("x","1em")
            .text(function(d) { return d.key + ' ' + d.value.rendered});

        li.selectAll("circle")
            .data(items,function(d) { return d.key})
            .call(function(d) { d.enter().append("circle")})
            .call(function(d) { d.exit().remove()})
            .attr("cy",function(d,i) { return i-0.25+"em"})
            .attr("cx",0)
            .attr("r","0.4em")
            .style("fill",function(d) { return d.value.color});

        // Reposition and resize the box
        var lbbox = li[0][0].getBBox()
        lb.attr("x",(lbbox.x-legendPadding))
            .attr("y",(lbbox.y-legendPadding))
            .attr("height",(lbbox.height+2*legendPadding))
            .attr("width",(lbbox.width+2*legendPadding))
      })
      return g
    }

    done()
  }
});
