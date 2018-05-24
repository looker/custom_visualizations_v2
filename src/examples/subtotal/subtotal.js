/* global looker */

const $ = require('jquery')
require('pivottable')
require('subtotal')($)
window.$ = $ // XXX

looker.plugins.visualizations.add({
  id: 'subtotal',
  label: 'Subtotal',

  options: {
    use_looker_row_totals: {
      type: 'boolean',
      label: "Use Looker's row totals",
      default: true
    }
  },

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

    const measures = config.query_fields.measures
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

    const labels = {}
    for (const obj of Object.values(config.query_fields)) {
      for (const field of obj) {
        const { name, view_label: label1, label_short: label2 } = field
        labels[name] = `${label1} <em>${label2}</em>`
      }
    }

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
        for (const pivotKey of Object.keys(row[measures[0].name])) {
          const pivotRow = Object.assign({}, ptRow)
          pivotRow[pivotName] = pivotKey
          for (const measure of measures) {
            pivotRow[measure.name] = row[measure.name][pivotKey].value
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
      const { type, name, view_label: label1, label_short: label2 } = measures[i]
      let agg
      switch (type) {
        case 'count': agg = tpl.sum(intFormat); break
        case 'count_distinct': agg = tpl.sum(intFormat); break
        case 'sum': agg = tpl.sum(customFormat); break
        case 'average': agg = tpl.average(customFormat); break
        case 'median': agg = tpl.median(customFormat); break
        case 'min': agg = tpl.min(customFormat); break
        case 'max': agg = tpl.max(customFormat); break
        case 'list': agg = tpl.listUnique(', '); break
        case 'percent_of_total': agg = tpl.fractionOf(tpl.sum(), 'total', customFormat); break
        default:
          this.addError({ title: `Measure type ${type} is unsupported` })
          return
      }
      aggregatorNames.push(`${label1} <em>${label2}</em>`)
      aggregators.push(agg([name]))
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
      labels,
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
