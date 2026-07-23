import { cn } from '@/lib/utils';

export function aqiCategory(aqi: number) {
  if (aqi <= 50) return { label: 'Good', color: '#22C55E', bg: 'bg-emerald-500' };
  if (aqi <= 100) return { label: 'Moderate', color: '#84CC16', bg: 'bg-lime-500' };
  if (aqi <= 150) return { label: 'Unhealthy (SG)', color: '#F59E0B', bg: 'bg-yellow-500' };
  if (aqi <= 200) return { label: 'Unhealthy', color: '#F97316', bg: 'bg-orange-500' };
  if (aqi <= 300) return { label: 'Very Unhealthy', color: '#EF4444', bg: 'bg-red-500' };
  return { label: 'Severe', color: '#7F1D1D', bg: 'bg-red-900' };
}

export function AqiBadge({ aqi, className }: { aqi: number; className?: string }) {
  const cat = aqiCategory(aqi);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white',
        cat.bg,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
      {cat.label}
    </span>
  );
}

export function AqiDot({ aqi, size = 14 }: { aqi: number; size?: number }) {
  const cat = aqiCategory(aqi);
  return (
    <span
      className="inline-block rounded-full"
      style={{ width: size, height: size, backgroundColor: cat.color, boxShadow: `0 0 ${size}px ${cat.color}80` }}
    />
  );
}
