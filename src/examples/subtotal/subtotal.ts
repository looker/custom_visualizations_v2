import * as $ from 'jquery'
import 'pivottable'
import subtotalMultipleAggregates from 'subtotal-multiple-aggregates'
import { handleErrors, formatType } from '../common/utils'

declare var require: any
const themeClassic = require('subtotal-multiple-aggregates/dist/looker-classic.css')
const themeWhite = require('subtotal-multiple-aggregates/dist/looker-white.css')

import { Looker, VisualizationDefinition } from '../types/types'

declare var looker: Looker

type Formatter = ((s: any) => string)
const defaultFormatter: Formatter = (x) => x.toString()

const LOOKER_ROW_TOTAL_KEY = '$$$_row_total_$$$'

subtotalMultipleAggregates($)

interface Subtotal extends VisualizationDefinition {
  style?: HTMLElement
}

const vis: Subtotal = {
  id: 'subtotal',
  label: 'Subtotal',

  options: {
    theme: {
      type: 'string',
      label: 'Theme',
      display: 'select',
      values: [
        { 'Classic': 'classic' },
        { 'White': 'white' }
      ],
      default: 'classic'
    },
    show_full_field_name: {
      type: 'boolean',
      label: 'Show Full Field Name',
      default: true
    }
  },

  create (element, config) {
    this.style = document.createElement('style')
    document.head.appendChild(this.style)
  },

  update (data, element, config, queryResponse, details) {
    if (!config || !data) return
    if (details && details.changed && details.changed.size) return
    if (!this.style) return

    if (!handleErrors(this, queryResponse, {
      min_pivots: 0, max_pivots: Infinity,
      min_dimensions: 1, max_dimensions: Infinity,
      min_measures: 1, max_measures: Infinity
    })) return

    const theme = config.theme || this.options.theme.default
    switch (theme) {
      case 'classic':
        this.style.innerHTML = themeClassic.toString()
        break
      case 'white':
        this.style.innerHTML = themeWhite.toString()
        break
      default:
        throw new Error(`Unknown theme: ${theme}`)
    }

    const pivots = config.query_fields.pivots.map((d: any) => d.name)
    const dimensions = config.query_fields.dimensions.map((d: any) => d.name)
    const measures = config.query_fields.measures

    const labels: { [key: string]: any } = {}
    for (const key of Object.keys(config.query_fields)) {
      const obj = config.query_fields[key]
      for (const field of obj) {
        const { name, view_label: label1, label_short: label2 } = field
        labels[name] = config.show_full_field_name ? { label: label1, sublabel: label2 } : { label: label2 }
      }
    }

    const ptData = []
    for (const row of data) {
      const ptRow: { [key: string]: any } = {}
      for (const key of Object.keys(row)) {
        const obj = row[key]
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
    const intFormat = formatType('###,###,###,##0')

    const aggregatorNames = []
    const aggregators = []
    for (let i = 0; i < measures.length; i++) {
      const { type, name, value_format, view_label: label1, label_short: label2 } = measures[i]
      const customFormat = formatType(value_format) || defaultFormatter
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
          if (this && this.clearErrors && this.addError) {
            this.clearErrors('measure-type')
            this.addError({
              group: 'measure-type',
              title: `Cannot Show "${label1} ${label2}"`,
              message: `Measure types of '${type}' are unsupported by this visualization.`
            })
          }
          return
      }
      const aggName = `measure_${i}`
      labels[aggName] = config.show_full_field_name ? { label: label1, sublabel: label2 } : { label: label1 }
      aggregatorNames.push(aggName)
      aggregators.push(agg([name]))
    }

    const numericSortAsc = (a: any, b: any) => a - b
    const numericSortDesc = (a: any, b: any) => b - a
    const stringSortAsc = (a: any, b: any) => (
      a === LOOKER_ROW_TOTAL_KEY ? Infinity :
      b === LOOKER_ROW_TOTAL_KEY ? -Infinity :
      String(a).localeCompare(b)
    )
    const stringSortDesc = (a: any, b: any) => (
      a === LOOKER_ROW_TOTAL_KEY ? Infinity :
      b === LOOKER_ROW_TOTAL_KEY ? -Infinity :
      String(b).localeCompare(a)
    )
    const sorters: any = {}
    for (const fieldType of ['measure_like', 'dimension_like', 'pivots']) {
      for (const field of queryResponse.fields[fieldType]) {
        if (field.sorted != null) {
          if (field.is_numeric) {
            sorters[field.name] = field.sorted.desc ? numericSortDesc : numericSortAsc
          } else {
            sorters[field.name] = field.sorted.desc ? stringSortDesc : stringSortAsc
          }
        }
      }
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
      sorters,
      hasColTotals: queryResponse.has_totals,
      hasRowTotals: queryResponse.has_row_totals
    }
    $(element).pivot(ptData, options)
  }
}

looker.plugins.visualizations.add(vis)
