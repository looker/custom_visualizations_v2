// install first yarn add ag-grid-community ag-grid-react

import AgGrid from './ag_grid'
import React from 'react'
import ReactDOM from 'react-dom'

looker.plugins.visualizations.add({
  // Id and Label are legacy properties that no longer have any function besides documenting
  // what the visualization used to have. The properties are now set via the manifest
  // form within the admin/visualizations page of Looker
  id: "react_test",
  label: "React Test",
  options: {
    font_size: {
      type: "string",
      label: "Font Size",
      values: [
        {"Large": "large"},
        {"Small": "small"}
      ],
      display: "radio",
      default: "large"
    }
  },
  // Set up the initial state of the visualization
  create: function(element, config) {

    // Insert a <style> tag with some styles we'll use later.
    element.innerHTML = `
      <style>
        .ag-grid-vis {
          /* Vertical centering */
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
        }
        .ag-grid-text-large {
          font-size: 72px;
        }
        .ag-grid-text-small {
          font-size: 18px;
        }
      </style>
    `;

    // Create a container element to let us center the text.
    let container = element.appendChild(document.createElement("div"));
    container.className = "ag-grid-vis";

    // Create an element to contain the text.
    this._textElement = container.appendChild(document.createElement("div"));

    // Render to the target element
    this.chart = ReactDOM.render(
      <AgGrid />,
      this._textElement
    );

  },
  // Render in response to the data or settings changing
  updateAsync: function(data, element, config, queryResponse, details, done) {

    // Clear any errors from previous updates
    this.clearErrors();

    // Throw some errors and exit if the shape of the data isn't what this chart needs
    if (queryResponse.fields.dimensions.length == 0) {
      this.addError({title: "No Dimensions", message: "This chart requires dimensions."});
      return;
    }

    // Set the size to the user-selected size
    if (config.font_size == "small") {
      this._textElement.className = "ag-grid-text-small";
    } else {
      this._textElement.className = "ag-grid-text-large";
    }

    // Grab the first cell of the data
    let firstRow = data[0];
    let firstCellValue = firstRow[queryResponse.fields.dimensions[0].name].value;

    // Finally update the state with our new data
    this.chart.setState({data: firstCellValue})

    // We are done rendering! Let Looker know.
    done()
  }
});
