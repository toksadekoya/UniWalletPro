// src/js/ChartService.js
export class ChartService {
  constructor() { this.chart = null; this.type = "category"; }
  setType(type) { this.type = type; }
  updateCategoryChart(){ /* no-op in tests */ }
  updateDailyChart(){ /* no-op in tests */ }
  destroy(){ this.chart = null; }
}