/* global looker */

const $ = require('jquery')
require('pivottable')
require('subtotal')($)
window.$ = $ // XXX

looker.plugins.visualizations.add({
  id: 'subtotal',
  label: 'Subtotal',

  options: (() => {
    const options = {
      use_looker_row_totals: {
        type: 'boolean',
        label: "Use Looker's row totals",
        default: true
      }
    }
    return options
    for (let i = 0; i < 5; i++) {
      options[`measure_${i + 1}`] = {
        order: i,
        type: 'string',
        label: `Measure ${i + 1}`,
        default: 'Sum',
        display: 'select',
        hidden: (config, queryResponse) => config.query_fields.measures.length < (i + 1), // XXX Never called!
        values: [
          // Must match the aggregators we define below.
          'Count',
          'Count Unique Values',
          'Sum',
          'Integer Sum',
          'Average',
          'Median',
          'Sample Variance',
          'Sample Standard Deviation',
          'Minimum',
          'Maximum'
        ].map(k => ({[k]: k}))
      }
    }
    options.measure_2.default = 'Maximum' // XXX testing
    return options
  })(),

  create (element, config) {
    [
      'https://unpkg.com/pivottable@2.20.0/dist/pivot.min.css',
      // 'https://unpkg.com/subtotal@1.11.0-alpha.0/dist/subtotal.min.css'
      'https://rawgit.com/4mile/subtotal/multi-aggregate/dist/subtotal.min.css'
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
    console.clear() // XXX
    window.x = { data, element, config, queryResponse, details } // XXX

    const dimensions = config.query_fields.dimensions.map(d => d.name)

    const measures = config.query_fields.measures.map(m => m.name)
    if (measures.length < 1) {
      return this.addError({
        title: 'A measure is required',
        messsage: 'Please make sure your explore has a measure'
      })
    }

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
        for (const pivotKey of Object.keys(row[measures[0]])) {
          const pivotRow = Object.assign({}, ptRow)
          pivotRow[pivotName] = pivotKey
          for (const measureName of measures) {
            pivotRow[measureName] = row[measureName][pivotKey].value
          }
          ptData.push(pivotRow)
        }
      }
    }

    // We create our own aggregators instead of using
    // $.pivotUtilities.aggregators because we want to use our own configurable
    // number formatter for some of them.
    const tpl = $.pivotUtilities.aggregatorTemplates
    const intFormat = (x) => Math.trunc(x)
    const customFormat = (x) => x // XXX TODO Make this configurable.

    const aggregatorNames = []
    const aggregators = []
    for (let i = 0; i < measures.length; i++) {
      let aggName = config[`measure_${i + 1}`] || this.options[`measure_${i + 1}`].default
      aggregatorNames.push(aggName)
      let agg
      switch (aggName) {
        case 'Count': agg = tpl.count(intFormat); break
        case 'Count Unique Values': agg = tpl.countUnique(intFormat); break
        case 'Sum': agg = tpl.sum(customFormat); break
        case 'Integer Sum': agg = tpl.sum(intFormat); break
        case 'Average': agg = tpl.average(customFormat); break
        case 'Median': agg = tpl.median(customFormat); break
        case 'Sample Variance': agg = tpl.var(1, customFormat); break
        case 'Sample Standard Deviation': agg = tpl.stdev(1, customFormat); break
        case 'Minimum': agg = tpl.min(customFormat); break
        case 'Maximum': agg = tpl.max(customFormat); break
        default: throw new Error(`Unknown aggregator: ${aggName}`)
      }
      aggregators.push(agg([measures[i]]))
    }

    const dataClass = $.pivotUtilities.SubtotalPivotDataMulti
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
      aggregatorNames,
      aggregators,
      hasColTotals: queryResponse.has_totals,
      hasRowTotals: queryResponse.has_row_totals,
      useLookerRowTotals: config.use_looker_row_totals
    }
    $(element).pivot(ptData, options)
  }
})
