import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  LineController,
  Tooltip,
  PointElement,
  LineElement,
  Filler,
  type ChartDataCustomTypesPerDataset,
  type DefaultDataPoint,
  type ChartOptions,
  type ChartType,
  type Plugin,
} from "chart.js";
import { createEffect, onCleanup } from "solid-js";
import { reconcile } from "solid-js/store";

type ChartProps<Kind extends ChartType, Data, Label> = {
  data: ChartDataCustomTypesPerDataset<Kind, Data, Label>;
  options?: ChartOptions<Kind>;
  class?: string;
};

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
);
Chart.defaults.font = { family: "'Comic Code', monospace", size: 14, lineHeight: 1.3 };
Chart.defaults.color = "#FEFEFE";
Chart.defaults.resizeDelay = 16;
Chart.defaults.borderColor = "#272552";
Chart.defaults.datasets.bar.borderRadius = 8;
Chart.defaults.scales.category.grid = { display: false };
Chart.defaults.scales.category.ticks.font = { family: "sans-serif", size: 15 };
Chart.defaults.plugins.tooltip.titleFont = { family: "sans-serif", size: 16, weight: "bold" };
Chart.defaults.plugins.tooltip.titleMarginBottom = 18;
Chart.defaults.plugins.tooltip.padding = 14;
Chart.defaults.plugins.tooltip.bodyFont = { size: 16 };
Chart.defaults.plugins.tooltip.footerFont = { size: 16, weight: "bold" };
Chart.defaults.plugins.tooltip.footerMarginTop = 14;
Chart.defaults.maintainAspectRatio = false;

function createChartComponent<CT extends ChartType>(
  chartType: CT,
  plugins?: Plugin<CT, unknown>[],
) {
  return function ChartComponent<Data = DefaultDataPoint<CT>, Label = unknown>(
    props: ChartProps<CT, Data, Label>,
  ) {
    return (
      <div class={props.class}>
        <canvas
          class="max-w-full"
          ref={(canvas: HTMLCanvasElement) => {
            let chart: undefined | Chart<CT, Data, Label>;
            createEffect(() => {
              if (chart) {
                const r = reconcile(props.data, { merge: true });
                chart.options = props.options as unknown as (typeof chart)["options"];
                chart.data = r(chart.data);
                chart.update();
              } else {
                chart = new Chart(canvas, {
                  type: chartType,
                  data: props.data,
                  options: props.options,
                  plugins,
                });
              }
            });
            onCleanup(() => {
              chart?.destroy();
              chart = undefined;
            });
          }}
        />
      </div>
    );
  };
}

export const BarChart = createChartComponent("bar");
export const LineChart = createChartComponent("line", [Filler]);

export function colorizeActiveTooltipItem(tooltipItem: { element: { active: boolean } }) {
  return tooltipItem.element.active ? "#6c6aea" : undefined;
}
