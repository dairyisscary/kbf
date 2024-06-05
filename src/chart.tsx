import { createEffect, onCleanup } from "solid-js";
import { reconcile } from "solid-js/store";
import {
  Chart,
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  type ChartDataCustomTypesPerDataset,
  type DefaultDataPoint,
} from "chart.js";

Chart.register(
  BarController,
  LineController,
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
);
Chart.defaults.font = { family: "Inter,sans-serif", size: 14 };
Chart.defaults.color = "#FEFEFE";
Chart.defaults.resizeDelay = 16;
Chart.defaults.borderColor = "#272552";
Chart.defaults.datasets.bar.borderRadius = 8;
Chart.defaults.scales.category.grid = { display: false };
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.elements.line.borderColor = "#64B6AC";
Chart.defaults.elements.line.borderWidth = 5;
Chart.defaults.elements.line.tension = 0.3;

type BarChartProps<Data, Label> = {
  data: ChartDataCustomTypesPerDataset<"bar" | "line", Data, Label>;
  class?: string;
};

export function BarChart<Data = DefaultDataPoint<"bar" | "line">, Label = unknown>(
  props: BarChartProps<Data, Label>,
) {
  return (
    <div class={props.class}>
      <canvas
        class="max-w-full"
        ref={(canvas: HTMLCanvasElement) => {
          let chart: undefined | Chart<"bar" | "line", Data, Label>;
          createEffect(() => {
            if (chart) {
              const r = reconcile(props.data, { merge: true });
              chart.data = r(chart.data);
              chart.update();
            } else {
              chart = new Chart(canvas, {
                type: "bar",
                data: props.data,
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
