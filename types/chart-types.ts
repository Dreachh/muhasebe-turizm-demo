// Charts için tip tanımları
import { ChartData, ChartOptions } from 'chart.js';

export interface ChartProps {
  data: ChartData<any, any, any>;  
  options?: ChartOptions<any>;
}
