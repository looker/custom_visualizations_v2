import { Cell, Link, Looker, LookerChartUtils, VisConfig, VisQueryResponse, VisData, VisUpdateDetails, VisualizationDefinition } from '../types/types'

import * as React from 'react'
import * as ReactDOM from 'react-dom'

/// <reference path="../types/react-pivottable.d.ts">
import * as PivotTable from 'react-pivottable/PivotTable'

// Global values provided via the API
declare var looker: Looker
declare var LookerCharts: LookerChartUtils

interface SubtotalVisProps {
  config: VisConfig
}

interface SubtotalVisState {
  config: VisConfig
  data?: VisData
  queryResponse?: VisQueryResponse
}

class SubtotalVis extends React.Component<SubtotalVisProps, SubtotalVisState> {
  constructor (props: SubtotalVisProps) {
    super(props)
    this.state = { config: props.config }
  }

  render () {
    const { config, data, queryResponse } = this.state
    if (!config || !data) return false

    const ptCols: string[] = []
    if (config.query_fields) {
      for (const { name } of config.query_fields.measures) {
        ptCols.push(name)
      }
      for (const { name } of config.query_fields.dimensions) {
        ptCols.push(name)
      }
    }

    const ptData: any[] = []
    for (const row of data) {
      const ptRow: { [name: string]: any } = {}
      for (const [key, obj] of Object.entries(row)) {
        ptRow[key] = obj.value
      }
      ptData.push(ptRow)
    }

    return <PivotTable
      rendererName='TableRenderer'
      data={ptData}
      cols={ptCols}
    />
  }
}

class Subtotal implements VisualizationDefinition {
  component?: React.RefObject<SubtotalVis>

  id = 'subtotal'
  label = 'Subtotal'
  options = {}

  create (element: HTMLElement, config: VisConfig) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/react-pivottable@0.5.0/pivottable.css'
    document.head.appendChild(link)

    this.component = React.createRef()
    ReactDOM.render(<SubtotalVis ref={this.component} config={config} />, element)
  }

  update (data: VisData, element: HTMLElement, config: VisConfig, queryResponse: VisQueryResponse, details?: VisUpdateDetails) {
    if (!this.component || !this.component.current) return
    if (details && details.changed && details.changed.size) return
    this.component.current.setState({ config, data, queryResponse })

  }

}

looker.plugins.visualizations.add(new Subtotal())
