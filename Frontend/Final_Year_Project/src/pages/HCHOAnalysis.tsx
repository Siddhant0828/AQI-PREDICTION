import { useState, lazy, Suspense } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer
} from 'recharts';
import { motion } from 'framer-motion';
import { Layers, Download, FileText, AlertTriangle, TrendingUp } from 'lucide-react';
import { SectionCard } from '@/components/SectionCard';
import { cn } from '@/lib/utils';
import dashData from '@/data/dashboard.json';

const IndiaMap = lazy(() => import('@/components/IndiaMap').then(m => ({ default: m.IndiaMap })));

const SEASONS = ['Pre-Monsoon', 'Monsoon', 'Post-Monsoon'] as const;

const temporalData = [
  { week: 'Oct 15', fires: 120, hcho: 4.2 },
  { week: 'Oct 22', fires: 380, hcho: 7.1 },
  { week: 'Oct 29', fires: 620, hcho: 9.8 },
  { week: 'Nov 05', fires: 980, hcho: 14.2 },
  { week: 'Nov 12', fires: 1420, hcho: 18.6 },
  { week: 'Nov 19', fires: 1280, hcho: 16.4 },
  { week: 'Nov 26', fires: 950, hcho: 13.1 },
  { week: 'Dec 03', fires: 720, hcho: 10.2 },
  { week: 'Dec 10', fires: 440, hcho: 7.4 },
  { week: 'Dec 17', fires: 180, hcho: 4.8 },
];

const hotspots = dashData.hotspots;

const ranked = [
  { rank: 1, region: 'Punjab (Bathinda)', hcho: 18.2, fires: 1240, type: 'Source', typeColor: '#EF4444', trend: 'up' },
  { rank: 2, region: 'Haryana (Kaithal)', hcho: 16.5, fires: 890, type: 'Mixed', typeColor: '#6B7280', trend: 'up' },
  { rank: 3, region: 'Delhi NCR', hcho: 15.8, fires: 12, type: 'Receptor', typeColor: '#123A8F', trend: 'down' },
  { rank: 4, region: 'UP (Meerut)', hcho: 14.1, fires: 450, type: 'Mixed', typeColor: '#6B7280', trend: 'up' },
];

export function HCHOAnalysis() {
  const [season, setSeason] = useState<typeof SEASONS[number]>('Post-Monsoon');
  const [showFires, setShowFires] = useState(true);
  const [showWind, setShowWind] = useState(true);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-700">HCHO Hotspot Detection</h2>
          <p className="text-sm text-muted-foreground">Formaldehyde Column Density Correlation with Active Biomass Fires</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-600 hover:border-primary/40 hover:bg-primary/5">
            <Layers className="h-3.5 w-3.5" />
            Layers
          </button>
          <button className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-600 hover:border-primary/40 hover:bg-primary/5">
            Terrain
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px_1fr_300px]">
        {/* Left controls */}
        <div className="flex flex-col gap-4">
          <SectionCard>
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-[11px] font-700 uppercase tracking-wide text-muted-foreground">Analysis Layers</div>
                <div className="space-y-2">
                  {[
                    { label: 'MODIS Fire Points', color: '#FF7A00', key: 'fires' },
                    { label: 'Wind Vectors', color: '#123A8F', key: 'wind' },
                  ].map((l) => (
                    <label key={l.key} className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={l.key === 'fires' ? showFires : showWind}
                        onChange={() => l.key === 'fires' ? setShowFires(v => !v) : setShowWind(v => !v)}
                        className="accent-[#123A8F]"
                      />
                      <span className="text-xs font-500">{l.label}</span>
                      <span className="ml-auto h-2 w-6 rounded-full" style={{ backgroundColor: l.color }} />
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[11px] font-700 uppercase tracking-wide text-muted-foreground">Season Selector</div>
                <div className="grid grid-cols-3 gap-1">
                  {SEASONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSeason(s)}
                      className={cn(
                        'rounded-lg py-1.5 text-[10px] font-600 border transition-all',
                        s === season
                          ? 'border-[#123A8F] bg-[#123A8F] text-white'
                          : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40'
                      )}
                    >
                      {s.replace('-', '\u2011')}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-muted/40 p-2 text-[11px] text-muted-foreground">
                  <span>Nov 01, 2023 — Jan 15, 2024</span>
                </div>
              </div>

              <div>
                <div className="mb-2 text-[11px] font-700 uppercase tracking-wide text-muted-foreground">HCHO Column Density (Molec/M²)</div>
                <div className="space-y-1.5">
                  {[
                    { label: '> 15.0 × 10⁻³', color: '#EF4444' },
                    { label: '10.0 – 15.0', color: '#F97316' },
                    { label: '5.0 – 10.0', color: '#F59E0B' },
                    { label: '< 5.0', color: '#22C55E' },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-2 text-[11px]">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: l.color }} />
                      <span className="text-muted-foreground">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Center — map */}
        <SectionCard bodyClassName="p-0" delay={0.1}>
          <Suspense fallback={<div className="flex h-[420px] items-center justify-center text-xs text-muted-foreground">Loading map…</div>}>
            <IndiaMap
              hotspots={hotspots as any}
              showFires={showFires}
              showHeatmap
              height="420px"
            />
          </Suspense>
          <div className="absolute bottom-16 right-4 z-[500] w-36 overflow-hidden rounded-xl border border-border bg-card/90 p-2 backdrop-blur">
            <div className="mb-1 text-[10px] font-700 uppercase text-muted-foreground">Transport Flow</div>
            <div className="flex h-14 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/20">
              <div className="text-[11px] text-muted-foreground">Wind vectors active</div>
            </div>
          </div>
        </SectionCard>

        {/* Right — ranked hotspots */}
        <div className="flex flex-col gap-4">
          <SectionCard title="Ranked Hotspot Regions" subtitle="Top contributors to HCHO atmospheric load" delay={0.15}>
            <div className="space-y-0">
              <div className="mb-2 grid grid-cols-[1fr_52px_52px_52px] text-[10px] font-700 uppercase tracking-wide text-muted-foreground">
                <span>#  Region</span>
                <span className="text-right">HCHO</span>
                <span className="text-right">Fires</span>
                <span className="text-right">Type</span>
              </div>
              {ranked.map((r) => (
                <motion.div
                  key={r.rank}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + r.rank * 0.06 }}
                  className="grid grid-cols-[1fr_52px_52px_52px] items-center border-b border-border py-2.5 last:border-0"
                >
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-700">
                      <span className="text-muted-foreground">{r.rank}</span>
                      {r.region}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-destructive">
                      <TrendingUp className="h-2.5 w-2.5" />
                      Rising
                    </div>
                  </div>
                  <div className="text-right text-xs font-700 text-primary">{r.hcho}</div>
                  <div className="text-right text-xs font-700" style={{ color: r.fires > 500 ? '#EF4444' : '#6B7280' }}>
                    {r.fires.toLocaleString()}
                  </div>
                  <div className="flex justify-end">
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-700 text-white"
                      style={{ backgroundColor: r.typeColor }}
                    >
                      {r.type}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-3 border-t border-border pt-3">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Regional Exposure Score</div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-[#F59E0B] to-[#EF4444]" />
                  </div>
                </div>
                <div className="text-sm font-700">7.8/10</div>
              </div>
            </div>
          </SectionCard>

          <div className="flex flex-col gap-3">
            <SectionCard delay={0.35} bodyClassName="py-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Analytical Export</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-700">Download Hotspot CSV</span>
                <button className="rounded-lg bg-muted/60 p-1.5 hover:bg-muted">
                  <Download className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </SectionCard>
            <button className="flex items-center justify-between rounded-xl bg-[#FF7A00] px-4 py-3 text-sm font-700 text-white hover:bg-[#e06c00]">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-white/80">Public Safety</div>
                <div>Generate Advisory</div>
              </div>
              <FileText className="h-5 w-5" />
            </button>
            <button className="flex items-center justify-between rounded-xl bg-destructive px-4 py-3 text-sm font-700 text-white hover:bg-red-700">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-white/80">Emergency Protocol</div>
                <div>Create Active Alert</div>
              </div>
              <AlertTriangle className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom chart */}
      <SectionCard
        title="Temporal Correlation Analysis"
        subtitle="Fire Intensity vs Formaldehyde Density Log"
        delay={0.4}
        action={
          <div className="flex items-center gap-4 text-[10px]">
            <span className="flex items-center gap-1.5 font-600 text-[#FF7A00]">
              <span className="h-3 w-6 rounded-full bg-[#FF7A00]" /> Fire Counts
            </span>
            <span className="flex items-center gap-1.5 font-600 text-[#123A8F]">
              <span className="h-[2px] w-6 bg-[#123A8F]" /> HCHO Level
            </span>
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={temporalData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="week" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis yAxisId="left" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Fire Counts', angle: -90, position: 'insideLeft', offset: 12, fontSize: 9, fill: '#FF7A00' }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'HCHO (×10¹⁶ mol/cm²)', angle: 90, position: 'insideRight', offset: 12, fontSize: 9, fill: '#123A8F' }} />
            <RTooltip contentStyle={{ borderRadius: 12, fontSize: 10 }} />
            <Bar yAxisId="left" dataKey="fires" fill="#FF7A00" radius={[4, 4, 0, 0]} opacity={0.85} />
            <Line yAxisId="right" type="monotone" dataKey="hcho" stroke="#123A8F" strokeWidth={2.5} dot={{ r: 4, fill: '#123A8F' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </SectionCard>
    </div>
  );
}
