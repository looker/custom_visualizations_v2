import React from 'react'

// Create (or import) our react component
export default class Hello extends React.Component {
  constructor () {
    // So we have access to 'this'
    super()

    // Set initial state to a loading or no data message
    this.state = {
      data: "No Data"
    }
  }

  // render our data
  render() {
    return <div>{this.state.data}</div>;
  }
}
