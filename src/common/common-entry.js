function formatType(valueFormat) {
  if (typeof valueFormat != "string") {
    return function (x) {return x}
  }
  let format = ""
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
  splitValueFormat = valueFormat.split(".")
  format += '.'
  format += splitValueFormat.length > 1 ? splitValueFormat[1].length : 0

  switch(valueFormat.slice(-1)) {
    case '%':
      format += '%'; break
    case '0':
      format += 'f'; break
  }
  return d3.format(format)
}

function handleErrors(vis, resp, options) {
  function messageFromLimits(min, max, field) {
    let message = "You need " + min
    if (max) {
      message += " to " + max
    }
    message += " " + field
    return message
  }

  if ((resp.fields.pivots.length < options.min_pivots) ||
      (resp.fields.pivots.length > options.max_pivots)) {
    let message
    vis.addError({
      group: "pivot-req",
      title: "Incompatible Pivot Data",
      message: messageFromLimits(options.min_pivots, options.max_pivots, "pivots"),
    });
    return false;
  } else {
    vis.clearErrors("pivot-req");
  }

  if ((resp.fields.dimensions.length < options.min_dimensions) ||
      (resp.fields.dimensions.length > options.max_dimensions)) {
    vis.addError({
      group: "dim-req",
      title: "Incompatible Dimension Data",
      message: messageFromLimits(options.min_dimensions, options.max_dimensions, "dimensions"),
    });
    return false;
  } else {
    vis.clearErrors("dim-req");
  }

  if ((resp.fields.measure_like.length < options.min_measures) ||
      (resp.fields.measure_like.length > options.max_measures)) {
    vis.addError({
      group: "mes-req",
      title: "Incompatible Measure Data",
      message: messageFromLimits(options.min_measures, options.max_measures, "measures"),
    });
    return false;
  } else {
    vis.clearErrors("mes-req");
  }
  return true;
}

window.d3v4 = require('./d3.v4')
window.formatType = formatType
window.handleErrors = handleErrors
