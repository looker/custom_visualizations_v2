import * as $ from 'jquery'
import 'pivottable'
import * as subtotalMultipleAggregates from 'subtotal-multiple-aggregates'

subtotalMultipleAggregates($)

import themeClassic from 'subtotal-multiple-aggregates/dist/looker-classic.css'
import themeWhite from 'subtotal-multiple-aggregates/dist/looker-white.css'

import { Row, Looker, VisualizationDefinition } from '../types/types'

const LOOKER_ROW_TOTAL_KEY = '$$$_row_total_$$$'

looker.plugins.visualizations.add({
  id: '',
  label: 'Subtotal',

  options: {
    use_looker_row_totals: {
      type: 'boolean',
      label: "Use Looker's row totals",
      default: true
    },
    theme: {
      type: 'string',
      label: "Theme",
      display: 'select',
      values: [
        { 'Classic': 'classic' },
        { 'White': 'white' }
      ],
      default: 'classic'
    }
  },

  create (element, config) {
    this.style = document.createElement('style')
    document.head.appendChild(this.style)
  },

  update (data, element, config, queryResponse, details) {
    if (!config || !data) return
    if (details && details.changed && details.changed.size) return

    const theme = config.theme || this.options.theme.default
    switch (theme) {
      case 'classic':
        this.style.innerHTML = themeClassic.toString()
        break
      case 'white':
        this.style.innerHTML = themeWhite.toString()
        break
    }

    const pivots = config.query_fields.pivots.map(d => d.name)
    const dimensions = config.query_fields.dimensions.map(d => d.name)

    const measures = config.query_fields.measures
    if (measures.length < 1) {
      return this.addError({
        title: 'A measure is required',
        messsage: 'Please make sure your explore has a measure'
      })
    }

    const labels = {}
    for (const obj of Object.values(config.query_fields)) {
      for (const field of obj) {
        const { name, view_label: label1, label_short: label2 } = field
        labels[name] = { label: label1, sublabel: label2 }
      }
    }

    const ptData = []
    for (const row of data) {
      const ptRow = {}
      for (const [key, obj] of Object.entries(row)) {
        if (pivots.includes(key)) continue
        ptRow[key] = obj.value
      }
      if (pivots.length === 0) {
        // No pivoting, just add each data row.
        ptData.push(ptRow)
      } else {
        // Fan out each row using the pivot. Multiple pivots are joined by `|FIELD|`.
        for (const flatKey of Object.keys(row[measures[0].name])) {
          const pivotRow = Object.assign({}, ptRow)
          if (flatKey === LOOKER_ROW_TOTAL_KEY) {
            for (const pivotKey of Object.keys(row[measures[0].name])) {
              for (const pivot of pivots) {
                pivotRow[pivot] = LOOKER_ROW_TOTAL_KEY
              }
              for (const measure of measures) {
                pivotRow[measure.name] = row[measure.name][pivotKey].value
              }
            }
          } else {
            const pivotValues = flatKey.split(/\|FIELD\|/g)
            for (let i = 0; i < pivots.length; i++) {
              pivotRow[pivots[i]] = pivotValues[i]
            }
            for (const measure of measures) {
              pivotRow[measure.name] = row[measure.name][flatKey].value
            }
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
        case 'int': agg = tpl.sum(intFormat); break
        case 'number': agg = tpl.sum(customFormat); break
        default:
          this.clearErrors('measure-type')
          this.addError({
            group: 'measure-type',
            title: `Cannot Show "${label1} ${label2}"`,
            message: `Measure types of '${type}' are unsupported by this visualization.`
          })
          return
      }
      const aggName = `measure_${i}`
      labels[aggName] = { label: label1, sublabel: label2 }
      aggregatorNames.push(aggName)
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
