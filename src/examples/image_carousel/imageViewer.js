import React from 'react';
import { Carousel } from 'react-responsive-carousel';

const URLREGEX = new RegExp("((http|https)(:\/\/))?([a-zA-Z0-9]+[.]{1}){2}[a-zA-Z0-9]+(\/{1}[a-zA-Z0-9]+)*\/?", "igm");
const B64REGEX = new RegExp("^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$", "igm");

const DOTS_THRESHOLD = 15;

const isUrlCheck = (strToCheck) => {
  return URLREGEX.test(strToCheck);
}

const isBase64StringCheck = (strToCheck) => {
  if (strToCheck && strToCheck.length > 150 && B64REGEX.test(strToCheck)) {
    try {
        return btoa(atob(strToCheck)) == strToCheck;
    } catch (err) {
        return false;
    }
  }
  return false;
}

// NOTE: this method loops over column key names without looking at column order
const findImageCol = (stateData) => {
  let tmpImageColData = {
    type: {
      url: false,
      base64: false
    },
    name: null
  }

  for (let row of stateData) {
    for (let colName of Object.keys(row)) {
      if (isUrlCheck(row[colName].value)) {
        tmpImageColData.type.url = true;
        tmpImageColData.type.base64 = false;  // set this in case we found b64 before finding a url
        tmpImageColData.name = colName;
        return tmpImageColData;
      } else if (isBase64StringCheck(row[colName].value)) {
        tmpImageColData.type.base64 = true;
        tmpImageColData.name = colName;
      }
    }
    // stop looping rows if we found a valid image column
    if (tmpImageColData.name) {
      return tmpImageColData;
    }
  }
  // resets this.state.imageColData to falsy if no valid image col was found
  return tmpImageColData;
}

// Create (or import) our react component
export default class ImageViewer extends React.Component {
  constructor () {
    super();

    // Set initial state to a loading or no data message, initialize imageColData
    this.state = {
      data: null,
      queryResponse: null,
      imageColData: {  // flatten
        type: {
          url: false,
          base64: false
        },
        name: null
      }
    };
  }

  // component mount/recv props, should component update - lifecycle method
  // if there is new data, call again to find column ...

  // render our data
  render() {
    // const { column } = this.props;
    if (!this.state.data) {
      return (
        <div>No Image Data Found</div>
      );
    }

    if (!this.state.imageColData.name) {
      this.state.imageColData = findImageCol(this.state.data);
    }

    // stop if no valid image data column found
    if (!this.state.imageColData.name) {
      return (
        <div>Please select at least one field with an image url or a base64 encoded image.</div>
      );
    }

    // check first row for the image column, if it is not present find the new valid image column
    // Rerun the image column check to make sure there is still a valid column, this needs to be refreshed when the 
    // explore is changed in looker.
    if (typeof this.state.data[0][this.state.imageColData.name] === 'undefined') {
      this.state.imageColData = findImageCol(this.state.data);
    }

    let tableRows = this.state.data.map((row, idx) => {
      let val = row[this.state.imageColData.name].value;  // image url or base64 string
      
      if (this.state.imageColData.type.base64) {
        val = `data:image/image;base64,${val}`;
      }

      return (
        <div key={idx}>
          <img src={val} />
        </div>
      );
    });

    // display image index linked dots in bottom of carousel, dots will stack into additional rows they overrun the carousel width
    let showIndicatorsBool = true;
    if (tableRows.length > DOTS_THRESHOLD) {
      showIndicatorsBool = false;
    }

    return (
      <Carousel dynamicHeight={true} showIndicators={showIndicatorsBool} showThumbs={false} swipeable={false}>
        {tableRows}
      </Carousel>
    );
  }
}
