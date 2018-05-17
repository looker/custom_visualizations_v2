/* global looker */

const $ = require('jquery')
require('pivottable')
require('subtotal')

looker.plugins.visualizations.add({
  id: 'subtotal',
  label: 'Subtotal',
  options: {},

  create (element, config) {
    [
      'https://unpkg.com/pivottable@2.20.0/dist/pivot.min.css',
      'https://unpkg.com/subtotal@1.11.0-alpha.0/dist/subtotal.min.css'
    ].forEach(url => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = url
      document.head.appendChild(link)
    })
  },

  update (data, element, config, queryResponse, details) {
    if (!config || !data) return
    if (details && details.changed && details.changed.size) return

    const dimensions = config.query_fields.dimensions.map(d => d.name)

    const measures = config.query_fields.measures.map(m => m.name)
    if (measures.length < 1) {
      return this.addError({
        title: 'A measure is required',
        messsage: 'Please make sure your explore has a measure'
      })
    }
    if (measures.length > 1) {
      return this.addError({
        title: 'Multiple measures are unsupported',
        messsage: 'Please make sure your explore only has one measure'
      })
    }
    const measureName = measures[0]

    const pivots = config.query_fields.pivots.map(d => d.name)
    if (pivots.length > 1) {
      return this.addError({
        title: 'Multiple pivots are unsupported',
        messsage: 'Please make sure your explore only has one pivot'
      })
    }
    const pivotName = pivots[0]

    const ptData = []
    for (const row of data) {
      const ptRow = {}
      for (const [key, obj] of Object.entries(row)) {
        if (key === pivotName) continue
        ptRow[key] = obj.value
      }
      if (pivots.length === 0) {
        // No pivoting, just add each data row.
        ptData.push(ptRow)
      } else {
        // Fan out each row using the pivot.
        for (const [pivotKey, pivotObj] of Object.entries(row[measureName])) {
          const pivotRow = Object.assign({}, ptRow)
          pivotRow[pivotName] = pivotKey
          pivotRow[measureName] = pivotObj.value
          ptData.push(pivotRow)
        }
      }
    }

    const sum = $.pivotUtilities.aggregatorTemplates.sum
    const numberFormat = $.pivotUtilities.numberFormat
    const intFormat = numberFormat({digitsAfterDecimal: 0})

    const dataClass = $.pivotUtilities.SubtotalPivotData
    const renderer = $.pivotUtilities.subtotal_renderers['Table With Subtotal']
    const rendererOptions = {
      arrowExpanded: '▼',
      arrowCollapsed: '▶'
    }

    const options = {
      rows: dimensions,
      cols: pivots,
      dataClass,
      renderer,
      rendererOptions,
      aggregator: sum(intFormat)([measures[0]])
    }
    $(element).pivot(ptData, options)
  }
})
