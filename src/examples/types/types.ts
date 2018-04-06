// API Globals
export interface Looker {
  plugins: {
    visualizations: {
      add: (visualization: VisualizationDefinition) => void
    }
  }
}

export interface LookerChartUtils {
  Utils: {
    openDrillMenu: (options: {links: Link[], event: object}) => void
    openUrl: (url: string, event: object) => void
    textForCell: (cell: Cell) => string
    filterableValueForCell: (cell: Cell) => string
    htmlForCell: (cell: Cell, context?: string, fieldDefinitionForCell?: any, customHtml?: string) => string
  }
}

// Looker visualization types
export interface VisualizationDefinition {
  id?: string
  label?: string
  options: VisOptions
  addError?: (error: VisualizationError) => void
  clearErrors?: (errorName?: string) => void
  create: (element: HTMLElement, settings: VisConfig) => void
  trigger?: (event: string, config: object[]) => void
  update?: (data: VisData, element: HTMLElement, config: VisConfig, queryResponse: VisQueryResponse, details?: VisUpdateDetails) => void
  updateAsync?: (data: VisData, element: HTMLElement, config: VisConfig, queryResponse: VisQueryResponse, details: VisUpdateDetails | undefined, updateComplete: () => void) => void
  destroy?: () => void
}

export interface VisOptions {[optionName: string]: VisOption}

export interface VisOptionValue {[label: string]: string}

export interface VisQueryResponse {
  [key: string]: any
  data: VisData
  fields: {
    [key: string]: any[]
  }
  pivots: Pivot[]
}

export interface Pivot {
  key: string
  is_total: boolean
  data: { [key: string]: string }
  metadata: { [key: string]: { [key: string]: string } }
}

export interface Link {
  label: string
  type: string
  type_label: string
  url: string
}

export interface Cell {
  [key: string]: any
  value: any
  rendered?: string
  html?: string
  links?: Link[]
}

export interface FilterData {
  add: string
  field: string
  rendered: string
}

export interface PivotCell {
  [pivotKey: string]: Cell
}

export interface Row {
  [fieldName: string]: PivotCell | Cell
}

export type VisData = Row[]

export interface VisConfig {
  [key: string]: VisConfigValue
}

export type VisConfigValue = any

export interface VisUpdateDetails {
  changed: {
    config?: string[]
    data?: boolean
    queryResponse?: boolean
    size?: boolean
  }
}

export interface VisOption {
  type: string,
  values?: VisOptionValue[],
  display?: string,
  default?: any,
  label: string,
  section?: string,
  placeholder?: string,
  display_size?: 'half' | 'third' | 'normal'
  order?: number
  min?: number
  max?: number
  required ?: boolean
}

export interface VisualizationError {
  group?: string
  message?: string
  title?: string
  retryable?: boolean
  warning?: boolean
}
