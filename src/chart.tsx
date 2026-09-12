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
import { createEffect, Loading, onSettled, Show } from "solid-js";

import { PhantomBlock } from "#/phantom";

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
  function Canvas<Data = DefaultDataPoint<CT>, Label = unknown>(
    props: ChartProps<CT, Data, Label>,
  ) {
    let canvasRef: HTMLCanvasElement | undefined; // oxlint-disable-line no-unassigned-vars
    let chart: Chart<CT, Data, Label> | undefined;

    onSettled(() => {
      chart = new Chart(canvasRef!, {
        type: chartType,
        data: props.data,
        options: props.options,
        plugins,
      });
      return () => {
        chart?.destroy();
        chart = undefined;
      };
    });

    createEffect(
      () => ({ options: props.options, data: props.data }),
      ({ data, options }) => {
        if (chart) {
          chart.options = options as unknown as (typeof chart)["options"];
          chart.data = data;
          chart.update();
        }
      },
      { defer: true },
    );

    return <canvas class="max-w-full" ref={canvasRef} />;
  }

  return function ChartComponent<Data = DefaultDataPoint<CT>, Label = unknown>(
    props: ChartProps<CT, Data, Label>,
  ) {
    return (
      <div class={props.class}>
        <Loading fallback={<PhantomBlock class="h-full w-full rounded-2xl" />}>
          {/* Ensure we trigger the loading by reading it with Show */}
          <Show when={Boolean(props.data)}>
            <Canvas<Data, Label> {...props} />
          </Show>
        </Loading>
      </div>
    );
  };
}

export const BarChart = createChartComponent("bar");
export const LineChart = createChartComponent("line", [Filler]);

export function colorizeActiveTooltipItem(tooltipItem: { element: { active: boolean } }) {
  return tooltipItem.element.active ? "#6c6aea" : undefined;
}
