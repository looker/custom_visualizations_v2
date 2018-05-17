/* global looker */

const $ = require('jquery')
require('pivottable')

looker.plugins.visualizations.add({
  id: 'subtotal',
  label: 'Subtotal',
  options: {},

  create (element, config) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/react-pivottable@0.5.0/pivottable.css'
    document.head.appendChild(link)
  },

  update (data, element, config, queryResponse, details) {
    if (!config || !data) return
    if (details && details.changed && details.changed.size) return

    const ptData = []
    for (const row of data) {
      const ptRow = {}
      for (const [key, obj] of Object.entries(row)) {
        ptRow[key] = obj.value
      }
      ptData.push(ptRow)
    }

    const rows = config.query_fields.dimensions.map(d => d.name)

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

    const sum = $.pivotUtilities.aggregatorTemplates.sum
    const numberFormat = $.pivotUtilities.numberFormat
    const intFormat = numberFormat({digitsAfterDecimal: 0})

    const options = {
      rows,
      aggregator: sum(intFormat)([measures[0]])
    }
    $(element).pivot(ptData, options)
  }
})
