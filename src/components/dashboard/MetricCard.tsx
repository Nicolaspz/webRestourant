import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: ReactNode;
  description?: string;
  className?: string;
}

export function MetricCard({ title, value, change, icon, description, className }: MetricCardProps) {
  return (
   <Card className={`metric-card ${className || ""}`}>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">{title}</CardTitle>
    <span className="metric-icon">{icon}</span>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
    {change !== undefined && (
      <div className={`flex items-center text-xs ${change >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
        {change >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
        {Math.abs(change).toFixed(2)}%
      </div>
    )}
    {description && (
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    )}
  </CardContent>
</Card>
  );
}