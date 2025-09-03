// tests/unit/chart.service.test.js
import { ChartService } from "../../src/js/ChartService.js";

describe("ChartService", () => {
  let chartService;

  beforeEach(() => {
    chartService = new ChartService();
  });

  test("constructor initializes with null chart and category type", () => {
    expect(chartService.chart).toBeNull();
    expect(chartService.type).toBe("category");
  });

  test("setType updates the type property", () => {
    chartService.setType("daily");
    expect(chartService.type).toBe("daily");
    
    chartService.setType("category");
    expect(chartService.type).toBe("category");
  });

  test("updateCategoryChart executes without error", () => {
    expect(() => {
      chartService.updateCategoryChart();
    }).not.toThrow();
  });

  test("updateDailyChart executes without error", () => {
    expect(() => {
      chartService.updateDailyChart();
    }).not.toThrow();
  });

  test("destroy sets chart to null", () => {
    // Set chart to some value first
    chartService.chart = { mock: "chart" };
    expect(chartService.chart).toEqual({ mock: "chart" });
    
    // Call destroy
    chartService.destroy();
    expect(chartService.chart).toBeNull();
  });

  test("multiple operations work correctly", () => {
    chartService.setType("daily");
    chartService.updateDailyChart();
    chartService.updateCategoryChart();
    chartService.destroy();
    
    expect(chartService.type).toBe("daily");
    expect(chartService.chart).toBeNull();
  });
});
