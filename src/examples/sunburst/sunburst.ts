import * as d3 from 'd3'
import { formatType, handleErrors } from '../common/utils'

import {
  Row,
  Looker,
  VisualizationDefinition
} from '../types/types'

// Global values provided via the API
declare var looker: Looker

interface SunburstVisualization extends VisualizationDefinition {
  svg?: any,
}

// recursively create children array
function descend(obj: any, depth: number = 0) {
  const arr: any[] = []
  for (const k in obj) {
    if (k === '__data') {
      continue
    }
    const child: any = {
      name: k,
      depth,
      children: descend(obj[k], depth + 1)
    }
    if ('__data' in obj[k]) {
      child.data = obj[k].__data
    }
    arr.push(child)
  }
  return arr
}

function burrow(table: Row[]) {
  // create nested object
  const obj: any = {}

  table.forEach((row: Row) => {
    // start at root
    let layer = obj

    // create children as nested objects
    row.taxonomy.value.forEach((key: any) => {
      layer[key] = key in layer ? layer[key] : {}
      layer = layer[key]
    })
    layer.__data = row
  })

  // use descend to create nested children arrays
  return {
    name: 'root',
    children: descend(obj, 1),
    depth: 0
  }
}

const vis: SunburstVisualization = {
  id: 'sunburst', // id/label not required, but nice for testing and keeping manifests in sync
  label: 'Sunburst',
  options: {
    color_range: {
      type: 'array',
      label: 'Color Range',
      display: 'colors',
      default: ['#dd3333', '#80ce5d', '#f78131', '#369dc1', '#c572d3', '#36c1b3', '#b57052', '#ed69af']
    }
  },
  // Set up the initial state of the visualization
  create(element, config) {
    this.svg = d3.select(element).append('svg')
  },
  // Render in response to the data or settings changing
  update(data, element, config, queryResponse) {
    if (!handleErrors(this, queryResponse, {
      min_pivots: 0, max_pivots: 0,
      min_dimensions: 1, max_dimensions: undefined,
      min_measures: 1, max_measures: 1
    })) return

    const width = element.clientWidth
    const height = element.clientHeight
    const radius = Math.min(width, height) / 2 - 8

    const dimensions = queryResponse.fields.dimension_like
    const measure = queryResponse.fields.measure_like[0]
    const format = formatType(measure.value_format) || ((s: any): string => s.toString())

    // TODO: lint-fix points out that these are unused. what were they meant for?
    const x = d3.scaleLinear().range([0, 2 * Math.PI])
    const y = d3.scaleSqrt().range([0, radius])

    const color = d3.scaleOrdinal().range(config.color_range)
    // const color = d3.scaleOrdinal().range(config.color_range || this.options.color_range.default) // DNR

    data.forEach(row => {
      row.taxonomy = {
        value: dimensions.map((dimension) => row[dimension.name].value)
      }
    })
    // row[dimension].value.split("-");

    const partition = d3.partition().size([2 * Math.PI, radius * radius])

    const arc = (
      d3.arc()
      .startAngle((d: any) => d.x0)
      .endAngle((d: any) => d.x1)
      .innerRadius((d: any) => Math.sqrt(d.y0))
      .outerRadius((d: any) => Math.sqrt(d.y1))
    )

    const svg = (
      this.svg
      .html('')
      .attr('width', '100%')
      .attr('height', '100%')
      .append('g')
      .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')')
    )

    const label = svg.append('text').attr('y', -height / 2 + 20).attr('x', -width / 2 + 20)

    const root = d3.hierarchy(burrow(data)).sum((d: any) => {
      return 'data' in d ? d.data[measure.name].value : 0
    })
    partition(root)

    svg
    .selectAll('path')
    .data(root.descendants())
    .enter()
    .append('path')
    .attr('d', arc)
    .style('fill', (d: any) => {
      if (d.depth === 0) return 'none'
      return color(d.ancestors().map((p: any) => p.data.name).slice(-2, -1))
    })
    .style('fill-opacity', (d: any) => 1 - d.depth * 0.15)
    .style('transition', (d: any) => 'fill-opacity 0.5s')
    .style('stroke', (d: any) => '#fff')
    .style('stroke-width', (d: any) => '0.5px')
    .on('click', (d: any) => {
      console.log(d)
    })
    .on('mouseenter', (d: any) => {
      const ancestorText = (
        d.ancestors()
        .map((p: any) => p.data.name)
        .slice(0, -1)
        .reverse()
        .join('-')
      )
      label.text(`${ancestorText}: ${format(d.value)}`)

      const ancestors = d.ancestors()
      svg
      .selectAll('path')
      .style('fill-opacity', (p: any) => {
        return ancestors.indexOf(p) > -1 ? 1 : 0.15
      })
    })
    .on('mouseleave', (d: any) => {
      label.text('')
      svg
      .selectAll('path')
      .style('fill-opacity', (d: any) => 1 - d.depth * 0.15)
    })
  }
}

looker.plugins.visualizations.add(vis)
