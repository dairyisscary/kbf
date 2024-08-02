import { createEffect, onCleanup } from "solid-js";
import { reconcile } from "solid-js/store";
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  type ChartDataCustomTypesPerDataset,
  type DefaultDataPoint,
  type ChartOptions,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, ChartDataLabels, Tooltip);
Chart.defaults.font = { family: "Inter,sans-serif", size: 14 };
Chart.defaults.color = "#FEFEFE";
Chart.defaults.resizeDelay = 16;
Chart.defaults.borderColor = "#272552";
Chart.defaults.datasets.bar.borderRadius = 8;
Chart.defaults.scales.category.grid = { display: false };
Chart.defaults.maintainAspectRatio = false;

type BarChartProps<Data, Label> = {
  data: ChartDataCustomTypesPerDataset<"bar", Data, Label>;
  options?: ChartOptions<"bar">;
  class?: string;
};

export function BarChart<Data = DefaultDataPoint<"bar">, Label = unknown>(
  props: BarChartProps<Data, Label>,
) {
  return (
    <div class={props.class}>
      <canvas
        class="max-w-full"
        ref={(canvas: HTMLCanvasElement) => {
          let chart: undefined | Chart<"bar", Data, Label>;
          createEffect(() => {
            if (chart) {
              const r = reconcile(props.data, { merge: true });
              chart.options = props.options as unknown as (typeof chart)["options"];
              chart.data = r(chart.data);
              chart.update();
            } else {
              chart = new Chart(canvas, {
                type: "bar",
                data: props.data,
                options: props.options,
                plugins: [ChartDataLabels],
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
}
