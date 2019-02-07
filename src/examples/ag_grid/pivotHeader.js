import { forEach } from 'lodash';

//
// User-defined grouped header class
//

class PivotHeader {
  init(agParams) {
    this.agParams = agParams;
    const pivots = this.agParams.displayName.split(', ');
    this.eGui = document.createElement('div');
    this.eGui.classList.add('outerPivotHeader');
    forEach(pivots, pivot => {
      const pivotDiv = document.createElement('div');
      pivotDiv.classList.add('pivotHeader');
      pivotDiv.innerHTML = pivot;
      this.eGui.appendChild(pivotDiv);
    });
  }

  getGui() {
    return this.eGui;
  }

  destroy() {
    return null;
  }
}

export default PivotHeader;
