// Tree-shaken ECharts: only the modules the dashboard uses are registered, so the full
// bundle never loads. This module (and everything importing it) is pulled in only by the
// lazily-loaded chart component, keeping ECharts out of both the landing bundle and the
// eager dashboard chunk. The palette lives in ./palette so eager code can use colors
// without importing this.

import * as echarts from "echarts/core";
import { LineChart, GaugeChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  MarkAreaComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  LineChart,
  GaugeChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  MarkAreaComponent,
  CanvasRenderer,
]);

export { echarts };
