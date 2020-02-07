import React, { useEffect } from 'react';
import * as d3 from 'd3';

const Viz = (props) => {
	useEffect(() => {
		d3.select('.viz > *').remove();
		draw(props)
	}, [props])
	return <div className='viz' />
}

const draw = (props) => {
  	// Calculate some initial values here

	d3.select('.viz > *').remove();

	// THIS CODE IS TAKEN FROM https://bl.ocks.org/lwthatcher/2ee04fa40a3c005007dc54d6da75198a
	// FOR ILLUSTRATIVE PURPOSES... INSIDE DRAW(), D3 RULES
	var margin = {top: 20, right: 20, bottom: 30, left: 50},
	    width = props.w - margin.left - margin.right,
	    height = props.h - margin.top - margin.bottom;

	// set the ranges
	var x = d3.scaleLinear().range([0, width]);
	var y = d3.scaleLinear().range([height, 0]);

	// append the svg obgect to the body of the page
	// appends a 'group' element to 'svg'
	// moves the 'group' element to the top left margin
	var svg = d3.select(".viz").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  	.append("g")
	    .attr("transform",
	          "translate(" + margin.left + "," + margin.top + ")");

	var getdata = function() {
	  var dataset = []
	  for (var i = 0; i < 20; i++) {
	    var x = d3.randomUniform(-50,50)();
	    var y = d3.randomUniform(-50,50)();
	    dataset.push({"x": x, "y": y});
	  }
	  return dataset
	}
	  
	// Get the data
	var data = getdata()

	// format the data
	data.forEach(function(d) {
	  d.x = +d.x;
	  d.y = +d.y;
	});

 	 // scale the range of the data
  	x.domain([-50, 50]);
  	y.domain([-50, 50]);

  	// add the dots
  	svg.selectAll("dot")
	    .data(data)
	    .enter().append("circle")
	    .attr("r", props.size)
	    .attr("fill", `${props.color}`)
	    .attr("cx", function(d) { return x(d.x); })
	    .attr("cy", function(d) { return y(d.y); });

  	// add the X Axis
  	svg.append("g")
    	.attr("transform", "translate(0," + height + ")")
    	.call(d3.axisBottom(x));

  	// add the Y Axis
  	svg.append("g")
    	.call(d3.axisLeft(y));


	// Continue d3 code here...

}

export default Viz