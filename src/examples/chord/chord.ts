import * as d3 from 'd3'
import { formatType, handleErrors } from '../common/utils'

import {
  Looker,
  VisualizationDefinition,
  VisData
} from '../types/types'

// Global values provided via the API
declare var looker: Looker

interface ChordVisualization extends VisualizationDefinition {
  svg?: any,
  tooltip?: any,
  computeMatrix: (data: VisData, dimensions: string[], measure: string) => any,
  titleText: (lookup: any, source: any, target: any, formatter: any) => string,
}

const vis: ChordVisualization = {
  id: 'chord',
  label: 'Chord',
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
    element.innerHTML = `
      <style>
        .chordchart circle {
          fill: none;
          pointer-events: all;
        }

        .chordchart:hover path.chord-fade {
          display: none;
        }

        .groups text {
          font-size: 12px;
        }

        .chord-tip {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 10;
        }
      </style>
    `

    this.tooltip = d3.select(element).append('div').attr('class', 'chord-tip')

    this.svg = d3.select(element).append('svg')
  },

  computeMatrix(data, dimensions, measure) {
    const indexByName = d3.map()
    const nameByIndex = d3.map()
    const matrix: any[] = []
    let n = 0

    // Compute a unique index for each package name.
    dimensions.forEach((dimension) => {
      data.forEach((d) => {
        const value = d[dimension].value
        if (!indexByName.has(value)) {
          nameByIndex.set(n.toString(), value)
          indexByName.set(value, n++)
        }
      })
    })

    // Construct a square matrix
    for (let i = -1; ++i < n;) {
      matrix[i] = []
      for (let t = -1; ++t < n;) {
        matrix[i][t] = 0
      }
    }

    // Fill matrix
    data.forEach(function (d) {
      const row = indexByName.get(d[dimensions[1]].value)
      const col = indexByName.get(d[dimensions[0]].value)
      const val = d[measure].value
      matrix[row][col] = val
    })

    return {
      matrix,
      indexByName,
      nameByIndex
    }
  },

  // Render in response to the data or settings changing
  update(data, element, config, queryResponse) {
    if (!handleErrors(this, queryResponse, {
      min_pivots: 0, max_pivots: 0,
      min_dimensions: 2, max_dimensions: 2,
      min_measures: 1, max_measures: 1
    })) return

    const dimensions = queryResponse.fields.dimension_like
    const measure = queryResponse.fields.measure_like[0]

    // Set dimensions
    const width = element.clientWidth
    const height = element.clientHeight
    const thickness = 15
    const outerRadius = Math.min(width, height) * 0.5
    const innerRadius = outerRadius - thickness

    // Stop if radius is < 0
    // TODO: show warning to user ???
    // TODO: Set a min-radius ???
    if (innerRadius < 0) return

    const valueFormatter = formatType(measure.value_format) || ((s: any): string => s.toString())

    const tooltip = this.tooltip

    // Set color scale
    const color = d3.scaleOrdinal().range(config.color_range)
    // const color = d3.scaleOrdinal().range(config.color_range || this.options.color_range.default) // DNR

    // Set chord layout
    const chord = d3.chord()
      .padAngle(0.025)
      .sortSubgroups(d3.descending)
      .sortChords(d3.descending)

    // Create ribbon generator
    const ribbon = d3.ribbon()
      .radius(innerRadius)

    // Create arc generator
    const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)

    // Turn data into matrix
    const matrix = this.computeMatrix(data, dimensions.map(d => d.name), measure.name)

    const svg = this.svg!

    // draw
    svg.html('')
      .attr('width', '100%')
      .attr('height', '100%')
      .append('g')
      .attr('class', 'chordchart')
      .attr('transform', 'translate(' + width / 2 + ',' + (height / 2) + ')')
      .datum(chord(matrix.matrix))

    svg.append('circle')
      .attr('r', outerRadius)

    const group = svg.append('g')
      .attr('class', 'groups')
      .selectAll('g')
      .data((chords: any) => chords.groups)
      .enter().append('g')
      .on('mouseover', (d: any, i: number) => {
        ribbons.classed('chord-fade', (p: any) => {
          return (
            p.source.index !== i
            && p.target.index !== i
          )
        })
      })

    const groupPath = group.append('path')
      .style('opacity', 0.8)
      .style('fill', (d: any) => color(d.index))
      .style('stroke', (d: any) => d3.rgb('red').darker())
      .attr('id', (d: any, i: number) => `group${i}`)
      .attr('d', arc)

    const groupPathNodes = groupPath.nodes()

    const groupText = group.append('text').attr('dy', 11)

    groupText.append('textPath')
      .attr('xlink:href', (d: any, i: number) => `#group${i}`)
      .attr('startOffset', (d: any, i: number) => (groupPathNodes[i].getTotalLength() - (thickness * 2)) / 4)
      .style('text-anchor', 'middle')
      .text((d: any) => {
        const txt = matrix.nameByIndex.get(d.index.toString())
        return txt
      })

    // Remove the labels that don't fit. :(
    groupText
      .filter(function (this: SVGTextElement, d: any, i: number) {
        return groupPathNodes[i].getTotalLength() / 2 - 16 < this.getComputedTextLength()
      })
      .remove()

    const ribbons = svg.append('g')
      .attr('class', 'ribbons')
      .selectAll('path')
      .data((chords: any) => chords)
      .enter().append('path')
      .style('opacity', 0.8)
      .attr('d', ribbon)
      .style('fill', (d: any) => color(d.target.index))
      .style('stroke', (d: any) => d3.rgb('blue').darker())
      .on('mouseenter', (d: any) => {
        tooltip.html(this.titleText(matrix.nameByIndex, d.source, d.target, valueFormatter))
      })
      .on('mouseleave', (d: any) => tooltip.html(''))

  },

  titleText: function (lookup, source, target, formatter = (s: string) => s) {
    const sourceName = lookup.get(source.index)
    const sourceValue = formatter(source.value)
    const targetName = lookup.get(target.index)
    const targetValue = formatter(target.value)

    const output = `
      <p>${sourceName} → ${targetName}: ${sourceValue}</p>
      <p>${targetName} → ${sourceName}: ${targetValue}</p>
    `

    return output
  }
}

looker.plugins.visualizations.add(vis)
