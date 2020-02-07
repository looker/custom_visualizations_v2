import Viz from './Viz'
import React from 'react'
import ReactDOM from 'react-dom'

looker.plugins.visualizations.add({
  	// Id and Label are legacy properties that no longer have any function besides documenting
  	// what the visualization used to have. The properties are now set via the manifest
  	// form within the admin/visualizations page of Looker
  	id: 'viz',
  	label: 'Looker Visualization',
  	options: {
      color: {
        type: `string`,
        label: `Color`,
        display: `color`,
        section: "Style",
        default: "#282828"
      },
      size: {
        label: 'Size',
        min: 0,
        max: 15,
        default: 3,
        section: 'Style',
        type: 'number',
        display: 'range'
      },

  	},
  	// Set up the initial state of the visualization
  	create: function(element, config) {
    	this.container = element.appendChild(document.createElement('svg'));
    	this.container.className = 'vis';
    	this.chart = ReactDOM.render(
        	<Viz />,
        	this.container
    	);
  	},
  	// Render in response to the data or settings changing
  	updateAsync: function(data, element, config, queryResponse, details, done) {
      	var margin = {top: 20, right: 20, bottom: 20, left: 20},
          	width = element.clientWidth,
          	height = element.clientHeight;

	    // Clear any errors from previous updates
	    this.clearErrors();

      	// Throw some errors and exit if the shape of the data isn't what this chart needs
      	if (queryResponse.fields.dimensions.length == 0) {
          	this.addError({title: 'No Dimensions', message: 'This chart requires dimensions.'});
          	return;
      	}

        // Grab the first cell of the data
        let firstRow = data[0];
        const firstCell = firstRow[queryResponse.fields.dimensions[0].name].value;

      	this.devDefaults = {
          	w: width,                       // Width of the circle
          	h: height,                      // Height of the circle
           	margin: margin,                 // The margins of the SVG
            data: firstCell,
            color: config.color,
            size: config.size
      	};

      	// Finally update the state with our new data
      	this.chart = ReactDOM.render(
          	<Viz {...this.devDefaults} />,
          	this.container
      	);

      	// We are done rendering! Let Looker know. Change!
      	done()
  	}
});
