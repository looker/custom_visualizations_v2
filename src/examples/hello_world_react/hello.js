import React from 'react'

// Create (or import) our react component
export default class Hello extends React.Component {
  constructor (props) {
    // So we have access to 'this'
    super(props)
  }

  // render our data
  render() {
    return <div>{this.props.data}</div>;
  }
}
