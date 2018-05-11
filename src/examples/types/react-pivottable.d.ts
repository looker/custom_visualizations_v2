// PivotTable Typescript definition file

interface PivotOptions {
  /**
   * array of attribute names to use as rows, defaults to []
   */
  rows?: string[]

  /**
   * array of attribute names for use as columns, defaults to []
   */
  cols?: string[]

  /**
   * constructor for an object which will aggregate results per cell, defaults to count()
   */
  aggregator?: any

  /**
   * function to generate output from pivot data structure (defaults to simple table)
   */
  renderer?: any

  /**
   * object to define derived attributes, defaults to {}
   */
  derivedAttributes?: any

  /**
   * function called on each record, returns false if the record is to be excluded from the input before rendering or true otherwise, (defaults to returning true for all records)
   */
  filter?: any

  /**
   * object passed through to renderer as options
   */
  rendererOptions?: any

  /**
   * locale-specific strings for error messages
   */
  localeStrings?: any
}

interface PivotUiOptions {
  /**
   * dictionary of rendering functions, defaulting with various table renderers
   */
  renderers?: any

  /**
   * dictionary of generators for aggregation functions in dropdown, defaulting to common aggregators
   */
  aggregators?: any

  /**
   * array of strings, attribute names to prepopulate in row area, default is []
   */
  rows?: string[]

  /**
   * array of strings, attribute names to prepopulate in cols area, default is []
   */
  cols?: string[]

  /**
   * array of strings, attribute names to prepopulate in vals area, default is []
   */
  vals?: string[]

  /**
   * string, aggregator to prepopulate in dropdown (key to aggregators object), default is first key in aggregators
   */
  aggregatorName?: string

  /**
   * string, renderer to prepopulate in radio button (key to renderers object), default is first key in renderers
   */
  rendererName?: string

  /**
   * object, defines derived attributes, default is {}
   */
  derivedAttributes?: any

  /**
   * function called on each record, returns false if the record is to be excluded from the input before rendering or true otherwise, (defaults to returning true for all records)
   */
  filter?: any

  /**
   * object, defaults to {}, keys are attribute names and values are arrays of attribute values which denote records to exclude from rendering (used to prepopulate the filter menus that appear on double-click)
   */
  exclusions?: any

  /**
   * array of strings, defaults to [], contains attribute names to omit from the UI
   */
  hiddenAttributes?: string[]

  /**
   * integer, defaults to 50, maximum number of values to list in the double-click menu
   */
  menuLimit?: number

  /**
   * object, defaults to null, passed through to renderer as options
   */
  rendererOptions?: any

  /**
   * function, called upon renderer refresh with an object representing the current UI settings
   */
  onRefresh?: (options: PivotUiOptions) => void

  /**
   * object, defaults to English strings - locale-specific strings for UI display
   */
  localeStrings?: any

  /**
   * boolean, defaults to false, controls whether or not unused attributes are kept sorted in the UI
   */
  autoSortUnusedAttrs?: boolean

  /**
   * boolean, defaults to false, controls whether or not unused attributes are shown vertically instead of the default which is horizontally
   */
  unusedAttrsVertical?: boolean

}

// require js module support

declare var PivotTable: any
declare module 'react-pivottable/PivotTable' {
  export = PivotTable
}
