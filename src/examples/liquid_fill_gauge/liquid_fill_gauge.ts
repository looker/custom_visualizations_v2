// Global values provided via the API
declare var looker: Looker

import * as d3 from 'd3'
import { handleErrors } from '../common/utils'

import * as LiquidFillGauge from './liquid_fill_gauge.js'

// @ts-ignore
LiquidFillGauge.initialize(d3)

import { Looker, VisualizationDefinition } from '../types/types'

interface LiquidFillGaugeVisualization extends VisualizationDefinition {
  svg?: any
}

// @ts-ignore
const defaults: any = LiquidFillGauge.defaultConfig

const vis: LiquidFillGaugeVisualization = {
  id: 'liquid_fill_gauge', // id/label not required, but nice for testing and keeping manifests in sync
  label: 'Liquid Fill Gauge',
  options: {
    showComparison: {
      label: 'Use field comparison',
      default: false,
      section: 'Value',
      type: 'boolean'
    },
    minValue: {
      label: 'Min value',
      min: 0,
      default: defaults.minValue,
      section: 'Value',
      type: 'number',
      placeholder: 'Any positive number'
    },
    maxValue: {
      label: 'Max value',
      min: 0,
      default: defaults.maxValue,
      section: 'Value',
      type: 'number',
      placeholder: 'Any positive number'
    },
    circleThickness: {
      label: 'Circle Thickness',
      min: 0,
      max: 1,
      step: 0.05,
      default: defaults.circleThickness,
      section: 'Style',
      type: 'number',
      display: 'range'
    },
    circleFillGap: {
      label: 'Circle Gap',
      min: 0,
      max: 1,
      step: 0.05,
      default: defaults.circleFillGap,
      section: 'Style',
      type: 'number',
      display: 'range'
    },
    circleColor: {
      label: 'Circle Color',
      default: defaults.circleColor,
      section: 'Style',
      type: 'string',
      display: 'color'
    },
    waveHeight: {
      label: 'Wave Height',
      min: 0,
      max: 1,
      step: 0.05,
      default: defaults.waveHeight,
      section: 'Waves',
      type: 'number',
      display: 'range'
    },
    waveCount: {
      label: 'Wave Count',
      min: 0,
      max: 10,
      default: defaults.waveCount,
      section: 'Waves',
      type: 'number',
      display: 'range'
    },
    waveRiseTime: {
      label: 'Wave Rise Time',
      min: 0,
      max: 5000,
      step: 50,
      default: defaults.waveRiseTime,
      section: 'Waves',
      type: 'number',
      display: 'range'
    },
    waveAnimateTime: {
      label: 'Wave Animation Time',
      min: 0,
      max: 5000,
      step: 50,
      default: defaults.waveAnimateTime,
      section: 'Waves',
      type: 'number',
      display: 'range'
    },
    waveRise: {
      label: 'Wave Rise from Bottom',
      default: defaults.waveRise,
      section: 'Waves',
      type: 'boolean'
    },
    waveHeightScaling: {
      label: 'Scale waves if high or low',
      default: defaults.waveHeightScaling,
      section: 'Waves',
      type: 'boolean'
    },
    waveAnimate: {
      label: 'Animate Waves',
      default: true,
      section: 'Waves',
      type: 'boolean'
    },
    waveColor: {
      label: 'Wave Color',
      default: '#64518A',
      section: 'Style',
      type: 'string',
      display: 'color'
    },
    waveOffset: {
      label: 'Wave Offset',
      min: 0,
      max: 1,
      step: 0.05,
      default: 0,
      section: 'Waves',
      type: 'number',
      display: 'range'
    },
    textVertPosition: {
      label: 'Text Vertical Offset',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.5,
      section: 'Value',
      type: 'number',
      display: 'range'
    },
    textSize: {
      label: 'Text Size',
      min: 0,
      max: 1,
      step: 0.01,
      default: 1,
      section: 'Value',
      type: 'number',
      display: 'range'
    },
    valueCountUp: {
      label: 'Animate to Value',
      default: true,
      section: 'Waves',
      type: 'boolean'
    },
    displayPercent: {
      label: 'Display as Percent',
      default: true,
      section: 'Value',
      type: 'boolean'
    },
    textColor: {
      label: 'Text Color (non-overlapped)',
      default: '#000000',
      section: 'Style',
      type: 'string',
      display: 'color'
    },
    waveTextColor: {
      label: 'Text Color (overlapped)',
      default: '#FFFFFF',
      section: 'Style',
      type: 'string',
      display: 'color'
    }
  },
  // Set up the initial state of the visualization
  create(element, config) {
    element.style.margin = '10px'
    element.style.fontFamily = `"Open Sans", "Helvetica", sans-serif`
    element.innerHTML = `
      <style>
        .node, .link {
          transition: 0.5s opacity;
        }
      </style>
    `
    const elementId = `fill-gauge-${Date.now()}`
    this.svg = d3.select(element).append('svg')
    this.svg.attr('id', elementId)
  },
  // Render in response to the data or settings changing
  update(data, element, config, queryResponse, details) {
    if (!handleErrors(this, queryResponse, {
      min_pivots: 0, max_pivots: 0,
      min_dimensions: 0, max_dimensions: undefined,
      min_measures: 1, max_measures: undefined
    })) return

    // @ts-ignore
    const gaugeConfig = Object.assign(LiquidFillGauge.defaultConfig, config)

    if (this.addError && this.clearErrors) {
      if (gaugeConfig.maxValue <= 0) {
        this.addError({ group: 'config', title: 'Max value must be greater than zero.' })
        return
      } else if (data.length === 0) {
        this.addError({ title: 'No results.' })
        return
      } else {
        this.clearErrors('config')
      }
    }

    const datumField = queryResponse.fields.measure_like[0]
    const datum = data[0][datumField.name]
    let value = datum.value

    const compareField = queryResponse.fields.measure_like[1]
    if (compareField && gaugeConfig.showComparison) {
      const compareDatum = data[0][compareField.name]
      gaugeConfig.maxValue = compareDatum.value
    }

    if (gaugeConfig.displayPercent) {
      value = datum.value / gaugeConfig.maxValue * 100
      gaugeConfig.maxValue = 100
    }

    this.svg.html('')
    this.svg.attr('width', element.clientWidth - 20)
    this.svg.attr('height', element.clientHeight - 20)

    // @ts-ignore
    if (details['print']) {
      Object.assign(gaugeConfig, {
        valueCountUp: false,
        waveAnimateTime: 0,
        waveRiseTime: 0,
        waveAnimate: false,
        waveRise: false
      })
    }
    // @ts-ignore
    d3.liquidfillgauge(this.svg, value, gaugeConfig)

  }
}

looker.plugins.visualizations.add(vis)
