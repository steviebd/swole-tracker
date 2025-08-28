import * as React from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "~/lib/utils";
import { GlassSurface } from "../ui/glass-surface";

/**
 * Workout volume chart component for volume over time visualization
 * 
 * Features:
 * - Responsive bar chart with gradient fills from design tokens
 * - Volume trend analysis with directional indicators
 * - Custom tooltip with workout details
 * - Glass surface container with animations
 * - Mobile-optimized touch interactions
 * - Accessible chart with proper ARIA labels
 */

export interface VolumeDataPoint {
  /** Date label for the data point */
  date: string;
  /** Total volume for the workout */
  volume: number;
  /** Number of exercises performed */
  exercises?: number;
  /** Workout duration in minutes */
  duration?: number;
  /** Full date for tooltip display */
  fullDate?: string;
  /** Workout name for tooltip */
  workoutName?: string;
}

export interface WorkoutVolumeChartProps {
  /** Array of volume data points to display */
  data: VolumeDataPoint[];
  /** Title for the chart */
  title: string;
  /** Unit of measurement for volume (e.g., "lbs", "kg") */
  volumeUnit: string;
  /** Height of the chart in pixels */
  height?: number;
  /** Show trend analysis */
  showTrend?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const WorkoutVolumeChart = React.forwardRef<HTMLDivElement, WorkoutVolumeChartProps>(
  ({ 
    data, 
    title, 
    volumeUnit,
    height = 300,
    showTrend = true,
    className,
    ...props 
  }, ref) => {
    // Calculate volume trend
    const calculateTrend = () => {
      if (data.length < 2) return { direction: 'stable', change: 0 };
      
      const recent = data.slice(-3);
      const earlier = data.slice(-6, -3);
      
      if (recent.length === 0 || earlier.length === 0) return { direction: 'stable', change: 0 };
      
      const recentAvg = recent.reduce((sum, d) => sum + d.volume, 0) / recent.length;
      const earlierAvg = earlier.reduce((sum, d) => sum + d.volume, 0) / earlier.length;
      
      const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;
      
      if (Math.abs(change) < 5) return { direction: 'stable', change: 0 };
      return { 
        direction: change > 0 ? 'up' : 'down', 
        change: Math.abs(change) 
      };
    };
    
    const trend = showTrend ? calculateTrend() : null;
    
    // Calculate stats
    const totalVolume = data.reduce((sum, d) => sum + d.volume, 0);
    const avgVolume = data.length > 0 ? totalVolume / data.length : 0;
    const maxVolume = Math.max(...data.map(d => d.volume));
    
    // Custom tooltip component
    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload?.length) {
        const data = payload[0].payload;
        return (
          <GlassSurface className="px-4 py-3 shadow-lg border min-w-[200px]">
            <div className="space-y-2">
              <div className="font-semibold text-foreground">
                {data.workoutName || "Workout"}
              </div>
              <div className="text-sm text-muted-foreground">
                {data.fullDate || label}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Volume:</span>
                  <span className="font-semibold text-primary">
                    {payload[0].value?.toLocaleString()} {volumeUnit}
                  </span>
                </div>
                {data.exercises && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Exercises:</span>
                    <span className="text-sm font-medium">{data.exercises}</span>
                  </div>
                )}
                {data.duration && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Duration:</span>
                    <span className="text-sm font-medium">{data.duration} min</span>
                  </div>
                )}
              </div>
            </div>
          </GlassSurface>
        );
      }
      return null;
    };
    
    // Trend icon component
    const TrendIcon = ({ direction }: { direction: string }) => {
      switch (direction) {
        case 'up':
          return <TrendingUp className="w-4 h-4 text-success" />;
        case 'down':
          return <TrendingDown className="w-4 h-4 text-destructive" />;
        default:
          return <Minus className="w-4 h-4 text-muted-foreground" />;
      }
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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Volume progression over time
                </p>
              </div>
              
              {/* Trend indicator */}
              {trend && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-muted"
                >
                  <TrendIcon direction={trend.direction} />
                  <div className="text-sm">
                    {trend.direction === 'stable' ? (
                      <span className="text-muted-foreground">Stable</span>
                    ) : (
                      <span className={cn(
                        "font-medium",
                        trend.direction === 'up' ? "text-success" : "text-destructive"
                      )}>
                        {trend.change.toFixed(1)}% {trend.direction === 'up' ? 'increase' : 'decrease'}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
          
          {/* Chart container */}
          <div 
            style={{ height }}
            className="w-full"
            role="img"
            aria-label={`${title} showing volume progression for ${data.length} workouts`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                {/* Grid */}
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="var(--color-border-muted)"
                  opacity={0.3}
                />
                
                {/* X-axis */}
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: 'var(--color-text-muted)',
                    fontSize: 12,
                  }}
                  dy={10}
                />
                
                {/* Y-axis */}
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: 'var(--color-text-muted)',
                    fontSize: 12,
                  }}
                  dx={-10}
                  tickFormatter={(value) => `${value.toLocaleString()}`}
                />
                
                {/* Tooltip */}
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{
                    fill: 'var(--color-primary-default)',
                    opacity: 0.1,
                  }}
                />
                
                {/* Animated bars */}
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Bar
                    dataKey="volume"
                    fill="url(#volumeGradient)"
                    radius={[4, 4, 0, 0]}
                  >
                    {/* Define gradient */}
                    <defs>
                      <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop 
                          offset="0%" 
                          stopColor="var(--color-primary-default)" 
                          stopOpacity={0.8} 
                        />
                        <stop 
                          offset="100%" 
                          stopColor="var(--color-primary-default)" 
                          stopOpacity={0.3} 
                        />
                      </linearGradient>
                    </defs>
                  </Bar>
                </motion.g>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Chart statistics */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-muted">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Total Volume</div>
              <div className="text-sm font-semibold text-foreground">
                {totalVolume.toLocaleString()} {volumeUnit}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Average</div>
              <div className="text-sm font-semibold text-foreground">
                {Math.round(avgVolume).toLocaleString()} {volumeUnit}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Best Session</div>
              <div className="text-sm font-semibold text-primary">
                {maxVolume.toLocaleString()} {volumeUnit}
              </div>
            </div>
          </div>
        </GlassSurface>
      </motion.div>
    );
  }
);

WorkoutVolumeChart.displayName = "WorkoutVolumeChart";

export { WorkoutVolumeChart };