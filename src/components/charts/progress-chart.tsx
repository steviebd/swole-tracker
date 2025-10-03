import * as React from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "~/lib/utils";
import { GlassSurface } from "../ui/glass-surface";

/**
 * Progress chart component for weekly/monthly progress visualization
 * 
 * Features:
 * - Responsive line chart with gradient strokes from design tokens
 * - Glass surface container with backdrop blur
 * - Smooth entrance animations with staggered data points
 * - Custom tooltip styling matching design system
 * - Mobile-optimized touch interactions
 * - Accessible chart with proper ARIA labels
 */

export interface ProgressDataPoint {
  /** Date label for the data point (e.g., "Mon", "Jan 15") */
  date: string;
  /** Progress value for the data point */
  value: number;
  /** Optional label for the full date */
  fullDate?: string;
}

export interface ProgressChartProps {
  /** Array of progress data points to display */
  data: ProgressDataPoint[];
  /** Title for the chart */
  title: string;
  /** Unit of measurement (e.g., "lbs", "reps", "min") */
  unit: string;
  /** Color theme for the chart line */
  theme?: 'primary' | 'success' | 'warning' | 'info';
  /** Height of the chart in pixels */
  height?: number;
  /** Additional CSS classes */
  className?: string;
}

const ProgressChart = React.forwardRef<HTMLDivElement, ProgressChartProps>(
  ({ 
    data, 
    title, 
    unit, 
    theme = 'primary',
    height = 300,
    className,
    ...props 
  }, ref) => {
    // Calculate min and max for better chart scaling
    const values = data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const padding = (maxValue - minValue) * 0.1 || 10;
    
    const palette = {
      primary: 'var(--chart-1, #1f78b4)',
      success: 'var(--chart-3, #33a02c)',
      warning: 'var(--chart-2, #ff7f0e)',
      info: 'var(--chart-4, #6a3d9a)',
    } as const;

    const strokeColor = palette[theme] ?? palette.primary;
    
    // Custom tooltip component
    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload?.length) {
        const data = payload[0].payload;
        return (
          <GlassSurface className="px-3 py-2 shadow-lg border">
            <div className="text-sm">
              <div className="font-medium text-foreground">
                {data.fullDate || label}
              </div>
              <div className="font-semibold" style={{ color: strokeColor }}>
                {payload[0].value} {unit}
              </div>
            </div>
          </GlassSurface>
        );
      }
      return null;
    };
    
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn("w-full", className)}
        {...props}
      >
        <GlassSurface className="p-6">
          {/* Chart header */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Progress over time ({unit})
            </p>
          </div>
          
          {/* Chart container */}
          <div 
            style={{ height }}
            className="w-full"
            role="img"
            aria-label={`${title} progress chart showing ${data.length} data points`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                {/* Grid */}
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="var(--md-sys-color-outline-variant)"
                  opacity={0.3}
                />
                
                {/* X-axis */}
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 12 }}
                  dy={10}
                />
                
                {/* Y-axis */}
                <YAxis
                  domain={[
                    Math.max(0, minValue - padding),
                    maxValue + padding
                  ]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 12 }}
                  dx={-10}
                />
                
                {/* Tooltip */}
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{
                    stroke: strokeColor,
                    strokeWidth: 1,
                    strokeDasharray: '4 4',
                  }}
                />
                
                {/* Animated line */}
                <motion.g
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
                >
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={strokeColor}
                    strokeWidth={3}
                    dot={{
                      fill: strokeColor,
                      strokeWidth: 2,
                      stroke: 'var(--md-sys-color-surface-container-high)',
                      r: 4,
                    }}
                    activeDot={{
                      r: 6,
                      fill: strokeColor,
                      stroke: 'var(--md-sys-color-surface-container-high)',
                      strokeWidth: 2,
                    }}
                    connectNulls={false}
                  />
                </motion.g>
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Chart stats */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-muted">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Min</div>
              <div className="text-sm font-semibold text-foreground">
                {minValue} {unit}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Max</div>
              <div className="text-sm font-semibold text-foreground">
                {maxValue} {unit}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Avg</div>
              <div className="text-sm font-semibold text-foreground">
                {Math.round(values.reduce((a, b) => a + b, 0) / values.length)} {unit}
              </div>
            </div>
          </div>
        </GlassSurface>
      </motion.div>
    );
  }
);

ProgressChart.displayName = "ProgressChart";

export { ProgressChart };
