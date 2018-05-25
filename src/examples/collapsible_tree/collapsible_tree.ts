// Global values provided via the API
declare var looker: Looker

import * as d3 from 'd3'
import { handleErrors } from '../common/utils'

import {
  Row,
  Looker,
  VisualizationDefinition
} from '../types/types'

interface CollapsibleTreeVisualization extends VisualizationDefinition {
  svg?: d3.Selection<d3.BaseType, {}, null, undefined>,
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

function burrow(table: any, taxonomy: any[]) {
  // create nested object
  const obj: any = {}

  table.forEach((row: Row) => {
    // start at root
    let layer = obj

    // create children as nested objects
    taxonomy.forEach((t: any) => {
      const key = row[t.name].value
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

const vis: CollapsibleTreeVisualization = {
  id: 'collapsible_tree', // id/label not required, but nice for testing and keeping manifests in sync
  label: 'Collapsible Tree',
  options: {},
  // Set up the initial state of the visualization
  create(element, config) {
    element.innerHTML = `
      <style>
        .node circle {
          fill: ${config.color_empty};
          stroke: ${config.color_with_children};
          stroke-width: 1.5px;
        }

        .node text {
          font-family: sans-serif;
          fill: #333;
        }

        .link {
          fill: none;
          stroke: #ccc;
          stroke-width: 1.5px;
        }
      </style>
    `

    this.svg = d3.select(element).append('svg')
  },

  // Render in response to the data or settings changing
  update(data, element, config, queryResponse) {
    if (!handleErrors(this, queryResponse, {
      min_pivots: 0, max_pivots: 0,
      min_dimensions: 2, max_dimensions: undefined,
      min_measures: 0, max_measures: undefined
    })) return

    let i = 0
    const nodeColors = {
      children: config.color_with_children,
      empty: config.color_empty
    }
    const textSize = 10
    const nodeRadius = 4
    const duration = 750
    const margin = { top: 10, right: 10, bottom: 10, left: 10 }
    const width = element.clientWidth - margin.left - margin.right
    const height = element.clientHeight - margin.top - margin.bottom
    const nested = burrow(data, queryResponse.fields.dimension_like)

    const svg = this.svg!
      .html('')
      .attr('width', width + margin.right + margin.left)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

    // declares a tree layout and assigns the size
    const treemap = d3.tree().size([height, width])

    // Assigns parent, children, height, depth
    const rootNode: any = d3.hierarchy(nested, (d) => d.children)
    rootNode.x0 = height / 2
    rootNode.y0 = 0

    // define some helper functions that close over our local variables

    // Collapse the node and all it's children
    function collapse(d: any) {
      if (d.children) {
        d._children = d.children
        d._children.forEach(collapse)
        d.children = null
      }
    }

    // Creates a curved (diagonal) path from parent to the child nodes
    function diagonal(s: any, d: any) {
      const path = `
        M ${s.y} ${s.x}
        C ${(s.y + d.y) / 2} ${s.x},
          ${(s.y + d.y) / 2} ${d.x},
          ${d.y} ${d.x}
      `.trim()

      return path
    }

    // Toggle children on click.
    function click(d: any) {
      if (d.children) {
        d._children = d.children
        d.children = null
      } else {
        d.children = d._children
        d._children = null
      }
      update(d)
    }

    // Update the display for a given node
    function update(source: any) {
      // Assigns the x and y position for the nodes
      const treeData = treemap(rootNode)

      // Compute the new tree layout.
      const nodes = treeData.descendants()
      const links = treeData.descendants().slice(1)

      // Normalize for fixed-depth.
      nodes.forEach((d) => {
        d.y = d.depth * 180
      })

      // ****************** Nodes section ***************************

      // Update the nodes...
      const node = (
        svg
          .selectAll('g.node')
          .data(nodes, (d: any) => d.id || (d.id = ++i))
      )

      // Enter any new modes at the parent's previous position.
      const nodeEnter = (
        node
          .enter()
          .append('g')
          .attr('class', 'node')
          .attr('transform', (d) => {
            return 'translate(' + source.y0 + ',' + source.x0 + ')'
          })
          .on('click', click)
      )

      // Add Circle for the nodes
      nodeEnter.append('circle')
        .attr('class', 'node')
        .attr('r', 1e-6)
        .style('fill', (d: any) => {
          return (
            d._children
              ? nodeColors.children
              : nodeColors.empty
          )
        })

      // Add labels for the nodes
      nodeEnter.append('text')
        .attr('dy', '.35em')
        .attr('x', (d: any) => {
          return d.children || d._children ? -textSize : textSize
        })
        .attr('text-anchor', (d: any) => {
          return d.children || d._children ? 'end' : 'start'
        })
        .style('font-size', textSize + 'px')
        .text((d: any) => d.data.name)

      // UPDATE
      const nodeUpdate = nodeEnter.merge(node)

      // Transition to the proper position for the node
      nodeUpdate.transition()
        .duration(duration)
        .attr('transform', (d) => {
          return 'translate(' + d.y + ',' + d.x + ')'
        })

      // Update the node attributes and style
      nodeUpdate.select('circle.node')
        .attr('r', nodeRadius)
        .style('fill', (d: any) => {
          return d._children ? nodeColors.children : nodeColors.empty
        })
        .attr('cursor', 'pointer')

      // Remove any exiting nodes
      const nodeExit = node.exit().transition()
        .duration(duration)
        .attr('transform', (d) => {
          return 'translate(' + source.y + ',' + source.x + ')'
        })
        .remove()

      // On exit reduce the node circles size to 0
      nodeExit.select('circle')
        .attr('r', 1e-6)

      // On exit reduce the opacity of text labels
      nodeExit.select('text')
        .style('fill-opacity', 1e-6)

      // ****************** links section ***************************

      // Update the links...
      const link = (
        svg
          .selectAll('path.link')
          .data(links, (d: any) => d.id)
      )

      // Enter any new links at the parent's previous position.
      const linkEnter = (
        link
          .enter()
          .insert('path', 'g')
          .attr('class', 'link')
          .attr('d', (d) => {
            const o = { x: source.x0, y: source.y0 }
            return diagonal(o, o)
          })
      )

      // UPDATE
      const linkUpdate = linkEnter.merge(link)

      // Transition back to the parent element position
      linkUpdate
        .transition()
        .duration(duration)
        .attr('d', (d) => diagonal(d, d.parent))

      // Remove any exiting links
      link
        .exit()
        .transition()
        .duration(duration)
        .attr('d', (d) => {
          const o = { x: source.x, y: source.y }
          return diagonal(o, o)
        })
        .remove()

      // Store the old positions for transition.
      nodes.forEach((d: any) => {
        d.x0 = d.x
        d.y0 = d.y
      })

    }

    // Collapse after the second level
    rootNode.children.forEach(collapse)

    // Update the root node
    update(rootNode)

  }
}

looker.plugins.visualizations.add(vis)
