declare module 'subtotal-multiple-aggregates' {
  const fn: PivotModule
  export default fn
}

interface PivotModule {
  ($: JQueryStatic): any
}

interface JQuery {
  pivot(data: any, options: any): JQuery
}

interface JQueryStatic<TElement extends Node = HTMLElement> {
  pivotUtilities: any
}