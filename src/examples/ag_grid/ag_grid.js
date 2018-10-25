/* eslint-disable arrow-body-style, no-undef, no-use-before-define */

class AgColumn {
  constructor(config) {
    this.config = config;
    this.formatColumns();
  }

  // Format the columns based on the queryResponse into an object ag-grid can handle.
  formatColumns() {
    const { queryResponse } = globalConfig;
    const { pivots, measures, dimensions: dims } = queryResponse.fields;
    const dimensions = basicDimensions(dims, this.config);

    const tableCalcs = queryResponse.fields.table_calculations;

    // Measures and table calcs are only shown in the context of pivots when present.
    if (!_.isEmpty(pivots)) {
      addPivots(dimensions, this.config);
    } else {
      // When there are no pivots, show measures and table calcs in own column.
      if (!_.isEmpty(measures)) {
        addMeasures(dimensions, measures, this.config);
      }
      if (!_.isEmpty(tableCalcs)) {
        addTableCalculations(dimensions, tableCalcs);
      }
    }

    this.formattedColumns = dimensions;
  }
}

class AgData {
  constructor(data, formattedColumns) {
    this.data = data;
    this.formattedColumns = formattedColumns;
    this.formatData();
  }

  formatData() {
    this.formattedData = this.data.map(datum => {
      const formattedDatum = {};

      this.formattedColumns.forEach(col => {
        const {
          children, colType, field: colField, lookup,
        } = col;
        if (colType === 'row') { return; }

        if (colType === 'pivot') {
          children.forEach(child => {
            formattedDatum[child.field] = displayData(datum[child.measure][child.pivotKey]);
          });
        } else {
          formattedDatum[colField] = displayData(datum[lookup]);
        }
      });

      return formattedDatum;
    });
  }
}

class GlobalConfig {
  setQueryResponse(qr) {
    this.queryResponse = qr;
  }
}

const globalConfig = new GlobalConfig();

//
// Display-related constants and functions
//

const autoSize = () => {
  gridOptions.columnApi.autoSizeAllColumns();
  const { gridPanel } = gridOptions.api;
  if (gridPanel.eBodyContainer.scrollWidth < gridPanel.eBody.scrollWidth) {
    gridOptions.api.sizeColumnsToFit();
  }
};

// Removes the current stylesheet in favor of user-selected theme in config.
const updateTheme = (classList, theme) => {
  const currentClass = _.find(classList, klass => {
    const match = klass.match('ag-theme');
    if (match !== null) {
      return match.input;
    }
    return null;
  });
  if (currentClass !== null) {
    classList.remove(currentClass);
  }
  classList.add(theme);
};

// All of the currently supported ag-grid stylesheets.
const themes = [
  { Balham: 'ag-theme-balham' },
  { 'Balham Dark': 'ag-theme-balham-dark' },
  { Fresh: 'ag-theme-fresh' },
  { Dark: 'ag-theme-dark' },
  { Blue: 'ag-theme-blue' },
  { Material: 'ag-theme-material' },
  { Bootstrap: 'ag-theme-bootstrap' },
];

const defaultTheme = 'ag-theme-balham';

const addCSS = link => {
  const linkElement = document.createElement('link');

  linkElement.setAttribute('rel', 'stylesheet');
  linkElement.setAttribute('href', link);

  document.getElementsByTagName('head')[0].appendChild(linkElement);
};

// Load all ag-grid default style themes.
const loadStylesheets = () => {
  addCSS('https://unpkg.com/ag-grid-community/dist/styles/ag-grid.css');
  themes.forEach(theme => {
    addCSS(`https://unpkg.com/ag-grid-community/dist/styles/${theme[Object.keys(theme)]}.css`);
  });
};

//
// User-defined cell renderers
//

// The mere presence of this renderer is enough to actually render HTML.
const baseCellRenderer = obj => obj.value;

// Looker's table is 1-indexed.
const rowIndexRenderer = obj => obj.rowIndex + 1;

//
// User-defined aggregation functions
//

const aggregate = (values, mType, valueFormat) => {
  if (_.isEmpty(values)) { return; }
  let agg;
  // TODO Support for more types of aggregations:
  // https://docs.looker.com/reference/field-reference/measure-type-reference
  if (mType === 'count') {
    agg = countAggFn(values);
  } else if (mType === 'average') {
    agg = avgAggFn(values);
  } else {
    // Default to sum.
    agg = sumAggFn(values);
  }
  let value;
  if (_.isEmpty(valueFormat)) {
    value = isFloat(agg) ? truncFloat(agg, values) : agg;
  } else {
    // TODO EUR and GBP symbols don't play nice. It fails gracefully though.
    value = numeral(agg).format(valueFormat);
  }
  return value;
};

const sumAggFn = values => {
  return _.reduce(values, (sum, n) => {
    return sum + n;
  }, 0);
};

const avgAggFn = values => {
  const total = _.reduce(values, (sum, n) => {
    return sum + n;
  }, 0);

  return total / values.length;
};

const countAggFn = values => {
  return _.reduce(values, (sum, n) => {
    return sum + parseInt(n, 10);
  }, 0);
};

//
// Aggregation helper functions
//

const truncFloat = (float, values) => {
  const digits = values[0].toString().split('.').pop().length;
  return float.toFixed(digits);
};

const isFloat = num => {
  return Number.isInteger(num) === false && num % 1 !== 0;
};

// In order to maintain proper formatting for aggregate columns, we are using
// a group aggregate function, which requires us to calculate aggregates for
// all columns at once. As a result, the code is significantly more complex
// than if we had used the simpler ag-grid individual column aggregate.
const groupRowAggNodes = nodes => {
  // This method is called often by ag-grid, sometimes with no nodes.
  const { queryResponse } = globalConfig;
  if (_.isEmpty(nodes) || queryResponse === undefined) { return; }

  const { measure_like: measures } = queryResponse.fields;
  const result = {};
  if (!_.isEmpty(queryResponse.pivots)) {
    const { pivots } = queryResponse;
    const fields = pivots.flatMap(pivot => {
      return measures.map(measure => { return `${pivot.key}_${measure.name}`; });
    });
    fields.forEach(field => { result[field] = []; });
    nodes.forEach(node => {
      const data = node.group ? node.aggData : node.data;
      fields.forEach(field => {
        if (typeof data[field] !== 'undefined') {
          const value = numeral(data[field]).value();
          if (value !== null) {
            result[field].push(value);
          }
        }
      });
    });
    pivots.forEach(pivot => {
      // Map over again to calculate a final result value and convert to value_format.
      measures.forEach(measure => {
        const { type: mType, value_format: valueFormat } = measure;
        const formattedField = `${pivot.key}_${measure.name}`;
        result[formattedField] = aggregate(
          result[formattedField], mType, valueFormat,
        ) || LookerCharts.Utils.textForCell({ value: null });
      });
    });
  } else {
    // XXX Merge this loop below.
    measures.forEach(measure => {
      result[measure.name] = [];
    });
    // Map over once to determine type and populate results array.
    nodes.forEach(node => {
      const data = node.group ? node.aggData : node.data;
      measures.forEach(measure => {
        const { name } = measure;
        if (typeof data[name] !== 'undefined') {
          const value = numeral(data[name]).value();
          if (value !== null) {
            result[name].push(value);
          }
        }
      });
    });

    // Map over again to calculate a final result value and convert to value_format.
    measures.forEach(measure => {
      const { name, type: mType, value_format: valueFormat } = measure;
      result[name] = aggregate(
        result[name], mType, valueFormat,
      );
    });
  }

  return result;
};

//
// User-defined grouped header class
//

class PivotHeader {
  init(agParams) {
    this.agParams = agParams;
    this.eGui = document.createElement('div');
    this.eGui.innerHTML = this.agParams.displayName;
  }

  getGui() {
    return this.eGui;
  }

  destroy() {
    return null;
  }
}

// Take into account config prefs for truncation and brevity.
const headerName = (dimension, config) => {
  let label;
  if (config.showFullFieldName) {
    label = dimension.label; // eslint-disable-line
  } else {
    label = dimension.label_short || dimension.label;
  }

  // TODO requires a _little_ more finesse.
  if (config.truncateColumnNames && label.length > 15) {
    label = `${label.substring(0, 12)}...`;
  }

  return label;
};

const addRowNumbers = basics => {
  basics.unshift({
    cellRenderer: rowIndexRenderer,
    colType: 'row',
    headerName: '',
    lockPosition: true,
    maxWidth: '*',
    rowGroup: false,
    suppressMenu: true,
    suppressResize: true,
    suppressSizeToFit: true,
  });
};

// Base dimensions before table calcs, pivots, measures, etc added.
const basicDimensions = (dimensions, config) => {
  const finalDimension = dimensions[dimensions.length - 1];
  const basics = _.map(dimensions, dimension => {
    console.log(dimension.name)
    const rowGroup = !(dimension.name === finalDimension.name);
    return {
      cellRenderer: baseCellRenderer,
      colType: 'default',
      field: dimension.name,
      headerName: headerName(dimension, config),
      hide: true,
      lookup: dimension.name,
      rowGroup: rowGroup,
      suppressMenu: true,
    };
  });

  if (config.showRowNumbers) {
    addRowNumbers(basics);
  }

  autoGroupColumnDef.setLastGroup(finalDimension.name);

  return basics;
};

const addTableCalculations = (dimensions, tableCalcs) => {
  let dimension;
  tableCalcs.forEach(calc => {
    dimension = {
      colType: 'table_calculation',
      field: calc.name,
      headerName: calc.label,
      lookup: calc.name,
      rowGroup: false,
      suppressMenu: true,
    };
    dimensions.push(dimension);
  });
};

const addMeasures = (dimensions, measures, config) => {
  let dimension;
  measures.forEach(measure => {
    const { name } = measure;
    dimension = {
      colType: 'measure',
      field: name,
      headerName: headerName(measure, config),
      lookup: name,
      measure: name,
      rowGroup: false,
      suppressMenu: true,
    };
    dimensions.push(dimension);
  });
};

// For every pivot there will be a column for all measures and table calcs.
const addPivots = (dimensions, config) => {
  const { queryResponse } = globalConfig;
  const { measure_like: measureLike } = queryResponse.fields;
  const { pivots } = queryResponse;

  let dimension;
  pivots.forEach(pivot => {
    const { key } = pivot;

    const outerDimension = {
      children: [],
      colType: 'pivot',
      field: key,
      headerGroupComponent: PivotHeader,
      headerName: key,
      rowGroup: false,
      suppressMenu: true,
    };

    measureLike.forEach(measure => {
      const { name } = measure;
      dimension = {
        colType: 'pivotChild',
        columnGroupShow: 'open',
        field: `${key}_${name}`,
        headerName: headerName(measure, config),
        measure: name,
        pivotKey: key,
        rowGroup: false,
        suppressMenu: true,
      };
      outerDimension.children.push(dimension);
    });

    dimensions.push(outerDimension);
  });
};

// Attempt to display in this order: HTML -> rendered -> value
const displayData = data => {
  if (_.isEmpty(data)) { return null; }
  let formattedData;
  if (data.html) {
    // XXX This seems to be a diff func than table. OK?
    formattedData = LookerCharts.Utils.htmlForCell(data);
  } else {
    formattedData = LookerCharts.Utils.textForCell(data);
  }

  return formattedData;
};

class AutoGroupColumnDef {
  constructor() {
    this.headerName = 'Group';
    this.cellRenderer = 'agGroupCellRenderer';
    this.cellRendererParams = {
      suppressCount: true,
    };
  }

  setLastGroup(field) {
    this.field = field;
  }
}

const autoGroupColumnDef = new AutoGroupColumnDef();

const gridOptions = {
  animateRows: true,
  autoGroupColumnDef,
  columnDefs: [],
  enableFilter: false,
  enableSorting: false,
  groupDefaultExpanded: -1,
  groupRowAggNodes,
  onFirstDataRendered: autoSize,
  onRowGroupOpened: autoSize,
  rowSelection: 'multiple',
  suppressAggFuncInHeader: true,
  suppressFieldDotNotation: true,
  suppressMovableColumns: true,
};

looker.plugins.visualizations.add({
  options: {
    showFullFieldName: {
      default: false,
      label: 'Show Full Field Name',
      order: 2,
      section: 'Series',
      type: 'boolean',
    },
    showRowNumbers: {
      default: true,
      label: 'Show Row Numbers',
      order: 2,
      section: 'Plot',
      type: 'boolean',
    },
    theme: {
      default: defaultTheme,
      display: 'select',
      label: 'Table Theme',
      order: 1,
      section: 'Plot',
      type: 'string',
      values: themes,
    },
    truncateColumnNames: {
      default: false,
      label: 'Truncate Column Names',
      order: 1,
      section: 'Series',
      type: 'boolean',
    },
  },

  create(element) {
    loadStylesheets();

    element.innerHTML = `
      <style>
        .ag-grid-vis {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
      </style>
    `;

    // Create an element to contain the grid.
    this.grid = element.appendChild(document.createElement('div'));
    this.grid.className = 'ag-grid-vis';

    this.grid.classList.add(defaultTheme);
    new agGrid.Grid(this.grid, gridOptions); // eslint-disable-line
  },

  updateAsync(data, _element, config, queryResponse, _details, done) {
    this.clearErrors();

    globalConfig.setQueryResponse(queryResponse);

    const { fields } = queryResponse;
    const {
      dimensions, measures, pivots, table_calculations: tableCalcs,
    } = fields;
    if (dimensions.length === 0) {
      this.addError({
        message: 'This chart requires dimensions.',
        title: 'No Dimensions',
      });
      return;
    }

    if (!_.isEmpty(pivots) && (_.isEmpty(measures) && _.isEmpty(tableCalcs))) {
      this.addError({
        message: 'Add a measure or table calculation to pivot on.',
        title: 'Empty Pivot(s)',
      });
      return;
    }

    updateTheme(this.grid.classList, config.theme);

    // Manipulates Looker's queryResponse into a format suitable for ag-grid.
    this.agColumn = new AgColumn(config);
    const { formattedColumns } = this.agColumn;
    gridOptions.api.setColumnDefs(formattedColumns);

    // Manipulates Looker's data response into a format suitable for ag-grid.
    this.agData = new AgData(data, formattedColumns);
    gridOptions.api.setRowData(this.agData.formattedData);

    autoSize();
    done();
  },
});
