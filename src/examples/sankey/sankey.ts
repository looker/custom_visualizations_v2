import * as d3 from 'd3'
import { sankey, sankeyLinkHorizontal, sankeyLeft } from 'd3-sankey'
import { handleErrors } from '../common/utils'

import {
  Cell,
  Link,
  Looker,
  LookerChartUtils,
  VisualizationDefinition
} from '../types/types'

// Global values provided via the API
declare var looker: Looker
declare var LookerCharts: LookerChartUtils

interface Sankey extends VisualizationDefinition {
  svg?: any
}

const vis: Sankey = {
  id: 'sankey', // id/label not required, but nice for testing and keeping manifests in sync
  label: 'Sankey',
  options: {
    color_range: {
      type: 'array',
      label: 'Color Range',
      display: 'colors',
      default: ['#dd3333', '#80ce5d', '#f78131', '#369dc1', '#c572d3', '#36c1b3', '#b57052', '#ed69af']
    },
    label_type: {
      default: 'name',
      display: 'select',
      label: 'Label Type',
      type: 'string',
      values: [
        { 'Name': 'name' },
        { 'Name (value)': 'name_value' }
      ]
    },
    show_null_points: {
      type: 'boolean',
      label: 'Plot Null Values',
      default: true
    }
  },
  // Set up the initial state of the visualization
  create (element, config) {
    element.innerHTML = `
      <style>
      .node,
      .link {
        transition: 0.5s opacity;
      }
      </style>
    `
    this.svg = d3.select(element).append('svg')
  },
  // Render in response to the data or settings changing
  updateAsync (data, element, config, queryResponse, details, doneRendering) {
    if (!handleErrors(this, queryResponse, {
      min_pivots: 0, max_pivots: 0,
      min_dimensions: 2, max_dimensions: undefined,
      min_measures: 1, max_measures: 1
    })) return

    const width = element.clientWidth
    const height = element.clientHeight

    const svg = this.svg
      .html('')
      .attr('width', '100%')
      .attr('height', '100%')
      .append('g')

    const dimensions = queryResponse.fields.dimension_like
    const measure = queryResponse.fields.measure_like[0]

    //  The standard d3.ScaleOrdinal<string, {}>, causes error
    // `no-inferred-empty-object-type  Explicit type parameter needs to be provided to the function call`
    // https://stackoverflow.com/questions/31564730/typescript-with-d3js-with-definitlytyped
    const color = d3.scaleOrdinal<string[], string[]>()
      .range(config.color_range || vis.options.color_range.default)

    const defs = svg.append('defs')

    const sankeyInst = sankey()
      .nodeAlign(sankeyLeft)
      .nodeWidth(10)
      .nodePadding(12)
      .extent([[1, 1], [width - 1, height - 6]])

    // TODO: Placeholder until @types catches up with sankey
    const newSankeyProps: any = sankeyInst
    newSankeyProps.nodeSort(null)

    let link = svg.append('g')
      .attr('class', 'links')
      .attr('fill', 'none')
      .attr('stroke', '#fff')
      .selectAll('path')

    let node = svg.append('g')
      .attr('class', 'nodes')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 10)
      .selectAll('g')

    const graph: any = {
      nodes: [],
      links: []
    }

    const nodes = d3.set()

    data.forEach(function (d: any) {
      // variable number of dimensions
      const path: any[] = []
      for (const dim of dimensions) {
        if (d[dim.name].value === null && !config.show_null_points) break
        path.push(d[dim.name].value + '')
      }
      path.forEach(function (p: any, i: number) {
        if (i === path.length - 1) return
        const source: any = path.slice(i, i + 1)[0] + i + `len:${path.slice(i, i + 1)[0].length}`
        const target: any = path.slice(i + 1, i + 2)[0] + (i + 1) +`len:${path.slice(i + 1, i + 2)[0].length}`
        
        nodes.add(source)
        nodes.add(target)
        // Setup drill links
        const drillLinks: Link[] = []
        for (const key in d) {
          if (d[key].links) {
            d[key].links.forEach((link: Link) => { drillLinks.push(link) })
          }
        }

        graph.links.push({
          'drillLinks': drillLinks,
          'source': source,
          'target': target,
          'value': +d[measure.name].value
        })
      })
    })

    const nodesArray = nodes.values()

    graph.links.forEach(function (d: Cell) {
      d.source = nodesArray.indexOf(d.source)
      d.target = nodesArray.indexOf(d.target)
    })

    graph.nodes = nodes.values().map((d: any) => {
      return {
        name: d.slice(0, d.split("len:")[1])
      }
    })

    sankeyInst(graph)

    link = link
      .data(graph.links)
      .enter().append('path')
      .attr('class', 'link')
      .attr('d', function (d: any) { return 'M' + -10 + ',' + -10 + sankeyLinkHorizontal()(d) })
      .style('opacity', 0.4)
      .attr('stroke-width', function (d: Cell) { return Math.max(1, d.width) })
      .on('mouseenter', function (this: any, d: Cell) {
        svg.selectAll('.link')
          .style('opacity', 0.05)
        d3.select(this)
          .style('opacity', 0.7)
        svg.selectAll('.node')
          .style('opacity', function (p: any) {
            if (p === d.source) return 1
            if (p === d.target) return 1
            return 0.5
          })
      })
      .on('click', function (this: any, d: Cell) {
        // Add drill menu event
        const coords = d3.mouse(this)
        const event: object = { pageX: coords[0], pageY: coords[1] }
        LookerCharts.Utils.openDrillMenu({
          links: d.drillLinks,
          event: event
        })
      })
      .on('mouseleave', function (d: Cell) {
        d3.selectAll('.node').style('opacity', 1)
        d3.selectAll('.link').style('opacity', 0.4)
      })

    // gradients https://bl.ocks.org/micahstubbs/bf90fda6717e243832edad6ed9f82814
    link.style('stroke', function (d: Cell, i: number) {

      // make unique gradient ids
      const gradientID = 'gradient' + i

      const startColor = color(d.source.name.replace(/ .*/, ''))
      const stopColor = color(d.target.name.replace(/ .*/, ''))

      const linearGradient = defs.append('linearGradient')
        .attr('id', gradientID)

      linearGradient.selectAll('stop')
        .data([
          { offset: '10%', color: startColor },
          { offset: '90%', color: stopColor }
        ])
        .enter().append('stop')
        .attr('offset', function (d: Cell) {
          return d.offset
        })
        .attr('stop-color', function (d: Cell) {
          return d.color
        })

      return 'url(#' + gradientID + ')'
    })

    node = node
      .data(graph.nodes)
      .enter().append('g')
      .attr('class', 'node')
      .on('mouseenter', function (d: Cell) {
        svg.selectAll('.link')
          .style('opacity', function (p: any) {
            if (p.source === d) return 0.7
            if (p.target === d) return 0.7
            return 0.05
          })
      })
      .on('mouseleave', function (d: Cell) {
        d3.selectAll('.link').style('opacity', 0.4)
      })
      

    node.append('rect')
      .attr('x', function (d: Cell) { return d.x0 })
      .attr('y', function (d: Cell) { return d.y0 })
      .attr('height', function (d: Cell) { return Math.abs(d.y1 - d.y0) })
      .attr('width', function (d: Cell) { return Math.abs(d.x1 - d.x0) })
      .attr('fill', function (d: Cell) { return color(d.name.replace(/ .*/, '')) })
      .attr('stroke', '#555')

    node.append('text')
      .attr('x', function (d: Cell) { return d.x0 - 6 })
      .attr('y', function (d: Cell) { return (d.y1 + d.y0) / 2 })
      .attr('dy', '0.35em')
      .style('font-weight', 'bold')
      .attr('text-anchor', 'end')
      .style('fill', '#222')
      .text(function (d: Cell) {
        switch (config.label_type) {
          case 'name':
            return d.name
          case 'name_value':
            return `${d.name} (${d.value})`
          default:
            return ''
        }
      })
      .filter(function (d: Cell) { return d.x0 < width / 2 })
      .attr('x', function (d: Cell) { return d.x1 + 6 })
      .attr('text-anchor', 'start')

    node.append('title')
      .text(function (d: Cell) { return d.name + '\n' + d.value })
    doneRendering()
  }
}
looker.plugins.visualizations.add(vis)
