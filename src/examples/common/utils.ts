import * as d3 from 'd3'

import {
  VisConfig,
  VisQueryResponse,
  VisualizationDefinition
} from '../types/types'

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

  switch (valueFormat.slice(-1)) { case '%': format += '%'; break
    case '0':
      format += 'f'; break
  }
  return d3.format(format)
}

export const handleErrors = (vis: VisualizationDefinition, res: VisQueryResponse, options: VisConfig) => {

  const check = (group: string, noun: string, count: number, min: number, max: number): boolean => {
    if (!vis.addError || !vis.clearErrors) return false
    if (count < min) {
      vis.addError({
        title: `Not Enough ${noun}s`,
        message: `This visualization requires ${min === max ? 'exactly' : 'at least'} ${min} ${noun.toLowerCase()}${ min === 1 ? '' : 's' }.`,
        group
      })
      return false
    }
    if (count > max) {
      vis.addError({
        title: `Too Many ${noun}s`,
        message: `This visualization requires ${min === max ? 'exactly' : 'no more than'} ${max} ${noun.toLowerCase()}${ min === 1 ? '' : 's' }.`,
        group
      })
      return false
    }
    vis.clearErrors(group)
    return true
  }

  const { pivots, dimensions, measure_like: measures } = res.fields

  return (check('pivot-req', 'Pivot', pivots.length, options.min_pivots, options.max_pivots)
   && check('dim-req', 'Dimension', dimensions.length, options.min_dimensions, options.max_dimensions)
   && check('mes-req', 'Measure', measures.length, options.min_measures, options.max_measures))
}
