import * as d3 from 'd3'

import {
  VisConfig,
  VisQueryResponse,
  VisualizationDefinition
} from '../types/types'

export function log(...args: any[]) {
  console.log.apply(console, args)
}

export const formatType = (valueFormat: string) => {
  if (!valueFormat) return undefined
  let format = ''
  switch (valueFormat.charAt(0)) {
    case '$':
      format += '$'; break
    case '£':
      format += '£'; break
    case '€':
      format += '€'; break
  }
  if (valueFormat.indexOf(',') > -1) {
    format += ','
  }
  const splitValueFormat = valueFormat.split('.')
  format += '.'
  format += splitValueFormat.length > 1 ? splitValueFormat[1].length : 0

  switch (valueFormat.slice(-1)) {
    case '%':
      format += '%'; break
    case '0':
      format += 'f'; break
  }
  return d3.format(format)
}

export const handleErrors = (vis: VisualizationDefinition, resp: VisQueryResponse, options: VisConfig) => {
  if (!vis.addError || !vis.clearErrors) return undefined

  function messageFromLimits (min: number, max: number, field: string) {

    let message = 'You need ' + min
    if (max) {
      message += ' to ' + max
    }
    message += ' ' + field
    return message
  }

  if ((resp.fields.pivots.length < options.min_pivots) ||
    (resp.fields.pivots.length > options.max_pivots)) {
    vis.addError({
      group: 'pivot-req',
      title: 'Incompatible Pivot Data',
      message: messageFromLimits(options.min_pivots, options.max_pivots, 'pivots')
    })
    return false
  } else {
    vis.clearErrors('pivot-req')
  }

  if ((resp.fields.dimensions.length < options.min_dimensions) || (resp.fields.dimensions.length > options.max_dimensions)) {
    vis.addError({
      group: 'dim-req',
      title: 'Incompatible Dimension Data',
      message: messageFromLimits(options.min_dimensions, options.max_dimensions, 'dimensions')
    })
    return false
  } else {
    vis.clearErrors('dim-req')
  }

  if ((resp.fields.measure_like.length < options.min_measures) || (resp.fields.measure_like.length > options.max_measures)) {
    vis.addError({
      group: 'mes-req',
      title: 'Incompatible Measure Data',
      message: messageFromLimits(options.min_measures, options.max_measures, 'measures')
    })
    return false
  } else {
    vis.clearErrors('mes-req')
  }
  return true
}
