import { motion } from 'framer-motion';
import CountUpRaw from 'react-countup';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

const CountUp: any = typeof CountUpRaw === 'function' ? CountUpRaw : (CountUpRaw as any)?.default || CountUpRaw;

interface KpiCardProps {
  label: string;
  value: number;
  unit?: string;
  suffix?: string;
  decimals?: number;
  category?: string;
  categoryColor?: string;
  trend?: number;
  trendDirection?: 'up' | 'down';
  icon: LucideIcon;
  iconColor?: string;
  delay?: number;
}

export function KpiCard({
  label,
  value,
  unit,
  suffix,
  decimals = 0,
  category,
  categoryColor,
  trend,
  trendDirection,
  icon: Icon,
  iconColor = '#123A8F',
  delay = 0,
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -3 }}
      className="group rounded-[18px] border border-border bg-card p-4 card-shadow transition-shadow hover:shadow-[0_12px_36px_rgba(16,24,40,0.10)] md:p-5"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="grid h-9 w-9 place-items-center rounded-xl"
            style={{ backgroundColor: `${iconColor}15`, color: iconColor }}
          >
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        </div>
        {typeof trend === 'number' && (
          <div
            className={cn(
              'flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold',
              trendDirection === 'up' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
            )}
          >
            {trendDirection === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div className="mt-3 flex items-end gap-1.5">
        <span className="text-3xl font-bold leading-none tracking-tight">
          <CountUp end={value} decimals={decimals} duration={1.4} separator="," />
        </span>
        {unit && <span className="mb-0.5 text-xs font-medium text-muted-foreground">{unit}</span>}
        {suffix && <span className="mb-0.5 text-xs font-medium text-muted-foreground">{suffix}</span>}
      </div>

      {category && (
        <div className="mt-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryColor }} />
          <span className="text-xs font-semibold" style={{ color: categoryColor }}>
            {category}
          </span>
        </div>
      )}
    </motion.div>
  );
}
