import { useState } from 'react';
import {
  Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Line, ComposedChart
} from 'recharts';
import { motion } from 'framer-motion';
import { Info, Layers, Play, Rewind, FastForward, Download } from 'lucide-react';
import { SectionCard } from '@/components/SectionCard';
import { cn } from '@/lib/utils';

const sources = [
  {
    id: 'biomass',
    label: 'Punjab/Haryana (Stubble Burning)',
    pct: 42,
    yoy: '+4.2% YOY',
    yoyColor: '#EF4444',
    barColor: '#FF7A00',
    img: 'https://images.pexels.com/photos/87369/weather-crop-fire-burnt-87369/photos/pexels-87369.jpeg?auto=compress&w=400',
  },
  {
    id: 'industrial',
    label: 'Indo-Gangetic Plain (Industrial)',
    pct: 28,
    yoy: '-2.1% YOY',
    yoyColor: '#22C55E',
    barColor: '#123A8F',
    img: 'https://images.pexels.com/photos/2101187/pexels-photo-2101187.jpeg?auto=compress&w=400',
  },
  {
    id: 'thermal',
    label: 'Central India (Thermal Power)',
    pct: 18,
    yoy: '-2.1% YOY',
    yoyColor: '#22C55E',
    barColor: '#6B7280',
    img: 'https://images.pexels.com/photos/157539/pexels-photo-157539.jpeg?auto=compress&w=400',
  },
  {
    id: 'urban',
    label: 'Western Coast (Urban/Traffic)',
    pct: 12,
    yoy: '+4.2% YOY',
    yoyColor: '#EF4444',
    barColor: '#22C55E',
    img: 'https://images.pexels.com/photos/1427541/pexels-photo-1427541.jpeg?auto=compress&w=400',
  },
];

function regressionLine(pts: { x: number; y: number }[]) {
  const n = pts.length;
  const sumX = pts.reduce((a, p) => a + p.x, 0);
  const sumY = pts.reduce((a, p) => a + p.y, 0);
  const sumXY = pts.reduce((a, p) => a + p.x * p.y, 0);
  const sumX2 = pts.reduce((a, p) => a + p.x * p.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return [
    { x: 0, y: intercept },
    { x: 600, y: slope * 600 + intercept },
  ];
}

const scatterData = [
  { x: 12, y: 9.2 }, { x: 45, y: 10.8 }, { x: 78, y: 13.5 }, { x: 120, y: 16.1 },
  { x: 180, y: 17.8 }, { x: 224, y: 19.2 }, { x: 267, y: 20.8 }, { x: 312, y: 22.4 },
  { x: 356, y: 24.0 }, { x: 389, y: 25.6 }, { x: 420, y: 27.2 }, { x: 450, y: 26.9 },
  { x: 480, y: 29.1 }, { x: 510, y: 30.5 }, { x: 540, y: 32.1 }, { x: 560, y: 31.8 },
  { x: 28, y: 11.2 }, { x: 95, y: 14.8 }, { x: 156, y: 17.1 }, { x: 198, y: 18.9 },
  { x: 234, y: 19.8 }, { x: 290, y: 21.5 }, { x: 335, y: 23.1 }, { x: 410, y: 26.2 },
  { x: 490, y: 28.8 }, { x: 525, y: 29.8 }, { x: 575, y: 33.2 },
];

const regLine = regressionLine(scatterData);

const LAYERS = ['Active Fire Points', 'Wind Vector Overlay', 'TROPOMI Column Density', 'Industrial Emission Points'] as const;

export function SourceAttribution() {
  const [layers, setLayers] = useState<Record<string, boolean>>({
    'Active Fire Points': true,
    'Wind Vector Overlay': false,
    'TROPOMI Column Density': true,
    'Industrial Emission Points': true,
  });
  const [sliderVal, setSliderVal] = useState(60);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-700">Source Attribution & Correlation Analysis</h2>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-700 uppercase tracking-wide text-primary">
              Scientific Review
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Spatio-temporal analysis of HCHO precursors from agricultural residue and industrial emissions.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-600 hover:border-primary/40 hover:bg-primary/5">
            <Info className="h-3.5 w-3.5" /> Methodology
          </button>
          <button className="flex items-center gap-1.5 rounded-xl bg-[#FF7A00] px-3 py-2 text-xs font-700 text-white hover:bg-[#e06c00]">
            Identify Hotspots
          </button>
        </div>
      </div>

      {/* Source cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {sources.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="group overflow-hidden rounded-[18px] border border-border bg-card card-shadow"
          >
            <div className="relative h-24 overflow-hidden">
              <img src={s.img} alt={s.label} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-2 left-3 text-[10px] font-700 uppercase tracking-wide text-white/80">Source Zone</span>
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
            </div>
            <div className="p-3">
              <div className="mb-1 text-xs font-600 leading-tight">{s.label}</div>
              <div className="text-2xl font-700 text-primary">{s.pct}%</div>
              <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">Seasonal Impact</div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${s.pct}%` }}
                  transition={{ duration: 0.8, delay: 0.4 + i * 0.1 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: s.barColor }}
                />
              </div>
              <div className="mt-1.5 text-[10px] font-600" style={{ color: s.yoyColor }}>
                {s.yoy}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Scatter + insights */}
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <SectionCard
          title="Fire Activity vs. HCHO Concentration"
          subtitle="Linear regression analysis for biomass burning attribution (MODIS/VIIRS vs. TROPOMI)"
          delay={0.25}
          action={<div className="text-sm font-700 text-primary">R² = 0.842 <span className="text-xs text-muted-foreground font-500">Confidence Interval: 95%</span></div>}
        >
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart margin={{ top: 8, right: 8, bottom: 24, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="x"
                type="number"
                name="Active Fire Points (MODIS)"
                label={{ value: 'Active Fire Points (MODIS)', position: 'insideBottom', offset: -16, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                domain={[0, 600]}
              />
              <YAxis
                dataKey="y"
                type="number"
                name="HCHO Density"
                label={{ value: 'HCHO Density (mol/cm²)', angle: -90, position: 'insideLeft', offset: 12, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                domain={[0, 36]}
              />
              <RTooltip contentStyle={{ borderRadius: 12, fontSize: 10 }} />
              <Scatter data={scatterData} fill="#123A8F" opacity={0.75} r={4} />
              <Line
                data={regLine}
                type="linear"
                dataKey="y"
                dot={false}
                stroke="#FF7A00"
                strokeWidth={2}
                legendType="none"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </SectionCard>

        <div className="flex flex-col gap-4">
          <SectionCard title="Key Insight" delay={0.3}>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              A strong positive correlation (R²=0.84) indicates that 84% of HCHO variation in the Northwest region is directly attributable to post-harvest biomass burning activity.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-muted/40 p-2.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Correlation</div>
                <div className="text-sm font-700 text-primary">Strong +</div>
              </div>
              <div className="rounded-xl bg-muted/40 p-2.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Lag Time</div>
                <div className="text-sm font-700 text-primary">4–6 Hours</div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Layer Visibility" icon={<Layers className="h-4 w-4" />} delay={0.35}>
            <div className="space-y-3">
              {LAYERS.map((l) => (
                <div key={l} className="flex items-center justify-between">
                  <span className="text-xs">{l}</span>
                  <button
                    onClick={() => setLayers((prev) => ({ ...prev, [l]: !prev[l] }))}
                    className={cn(
                      'relative h-5 w-9 rounded-full transition-colors',
                      layers[l] ? 'bg-[#123A8F]' : 'bg-muted'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                        layers[l] ? 'left-4' : 'left-0.5'
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
              <span className="text-muted-foreground">Inspect Regional Outliers</span>
              <span className="font-700 text-primary">12 Units</span>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Timeline slider */}
      <SectionCard delay={0.45} bodyClassName="py-3">
        <div className="flex items-center gap-4">
          <div className="hidden flex-col md:flex">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Active Observation Period</div>
            <div className="text-xs font-700 text-[#FF7A00]">12 Nov 2023 — 04:30 PM IST</div>
          </div>
          <div className="flex gap-1.5">
            <button className="rounded-lg bg-muted/60 p-2 hover:bg-muted"><Rewind className="h-4 w-4 text-muted-foreground" /></button>
            <button className="rounded-lg bg-[#123A8F] p-2 text-white hover:bg-[#0d2b6b]"><Play className="h-4 w-4" /></button>
            <button className="rounded-lg bg-muted/60 p-2 hover:bg-muted"><FastForward className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="flex-1">
            <input
              type="range"
              min={0}
              max={100}
              value={sliderVal}
              onChange={(e) => setSliderVal(Number(e.target.value))}
              className="w-full accent-[#123A8F]"
            />
            <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
              {['Oct 01', 'Oct 15', 'Nov 01 (Start)', 'Nov 15', 'Dec 01', 'Dec 15', 'Dec 31'].map((l) => (
                <span key={l}>{l}</span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="rounded-xl bg-[#0d1f44] px-3 py-2 text-[11px] font-700 text-white hover:bg-[#123A8F]">
              Biomass Peak Mode
            </button>
            <button className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[11px] font-600 hover:border-primary/40">
              <Download className="h-3.5 w-3.5" /> Export Sequence
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
