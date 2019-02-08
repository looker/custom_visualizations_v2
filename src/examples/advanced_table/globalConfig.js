class GlobalConfig {
  constructor() {
    this.selectedFields = [];
  }

  addSelectedField(field) {
    if (this.selectedFields.indexOf(field) === -1) {
      this.selectedFields.push(field);
    }
  }

  removeSelectedField(field) {
    this.selectedFields = this.selectedFields.filter(selectedField => {
      return selectedField !== field;
    });
  }
}

export default GlobalConfig;
