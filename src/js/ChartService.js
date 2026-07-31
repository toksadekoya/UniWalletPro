import Chart from 'chart.js/auto';

export class ChartService {
  constructor(canvas, ChartConstructor = Chart) {
    this.canvas = canvas;
    this.ChartConstructor = ChartConstructor;
    this.chart = null;
  }

  render(config) {
    this.destroy();
    this.chart = new this.ChartConstructor(this.canvas, config);
    return this.chart;
  }

  renderCategories(labels, values, colours) {
    return this.render({
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colours, borderWidth: 0 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
      },
    });
  }

  renderDaily(labels, values) {
    return this.render({
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Daily spending',
          data: values,
          borderColor: '#1d4ed8',
          backgroundColor: 'rgba(29, 78, 216, 0.12)',
          tension: 0.25,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (value) => `£${Number(value).toFixed(0)}` },
          },
        },
      },
    });
  }

  destroy() {
    this.chart?.destroy();
    this.chart = null;
  }
}
