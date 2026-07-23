import { useState, lazy, Suspense } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer
} from 'recharts';
import { motion } from 'framer-motion';
import { Download, Info, Layers, Wind, Target } from 'lucide-react';
import { SectionCard } from '@/components/SectionCard';
import { cn } from '@/lib/utils';

const IndiaMap = lazy(() => import('@/components/IndiaMap').then(m => ({ default: m.IndiaMap })));

const POLLUTANTS = ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3'] as const;
const MODELS = ['Blended', 'Satellite', 'CPCB'] as const;
const UNITS = ['µg/m³', 'AQI Index'] as const;

const predAcc = [
  { t: '00:00', predicted: 148, ground: 155 },
  { t: '04:00', predicted: 162, ground: 158 },
  { t: '08:00', predicted: 195, ground: 188 },
  { t: '12:00', predicted: 220, ground: 212 },
  { t: '16:00', predicted: 218, ground: 225 },
  { t: '20:00', predicted: 230, ground: 238 },
  { t: '23:59', predicted: 215, ground: 210 },
];

const hotspots = [
  { id: 'h1', location: 'Punjab North', state: 'Punjab', lat: 31.15, lng: 75.34, hcho: 8.4, fires: 142, intensity: 'high' as const },
  { id: 'h2', location: 'Haryana Belt', state: 'Haryana', lat: 29.05, lng: 76.13, hcho: 7.2, fires: 98, intensity: 'high' as const },
  { id: 'h3', location: 'Western UP', state: 'Uttar Pradesh', lat: 27.87, lng: 78.02, hcho: 6.1, fires: 76, intensity: 'medium' as const },
];

export function AQIExplorer() {
  const [pollutant, setPollutant] = useState<typeof POLLUTANTS[number]>('PM2.5');
  const [model, setModel] = useState<typeof MODELS[number]>('Blended');
  const [unit, setUnit] = useState<typeof UNITS[number]>('AQI Index');
  const [opacity, setOpacity] = useState(80);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-700">AQI Explorer</h2>
        <p className="text-[13px] text-muted-foreground">Adjust spatial parameters and layers</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[280px_1fr_300px]">
        {/* Left — controls */}
        <div className="flex flex-col gap-4">
          <SectionCard title="Map Controls" subtitle="Adjust spatial parameters and layers">
            <div className="space-y-4">
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-[11px] font-700 uppercase tracking-wide text-primary">
                  <Layers className="h-3.5 w-3.5" />
                  Select Pollutant
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {POLLUTANTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPollutant(p)}
                      className={cn(
                        'rounded-lg py-2 text-xs font-600 transition-all border',
                        p === pollutant
                          ? 'border-[#123A8F] bg-[#123A8F] text-white'
                          : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:bg-primary/5'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 flex items-center gap-1.5 text-[11px] font-700 uppercase tracking-wide text-primary">
                  <Target className="h-3.5 w-3.5" />
                  Data Source Model
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {MODELS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setModel(m)}
                      className={cn(
                        'rounded-lg py-2 text-[11px] font-600 border transition-all',
                        m === model
                          ? 'border-[#123A8F] bg-[#123A8F] text-white'
                          : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40'
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[11px] font-700 uppercase tracking-wide text-muted-foreground">Layer Opacity</label>
                  <span className="text-xs font-700 text-primary">{opacity}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-[#123A8F]"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-700 uppercase tracking-wide text-muted-foreground">Display Units</label>
                <div className="flex gap-2">
                  {UNITS.map((u) => (
                    <button
                      key={u}
                      onClick={() => setUnit(u)}
                      className={cn(
                        'flex-1 rounded-lg py-2 text-[11px] font-600 border transition-all',
                        u === unit
                          ? 'border-[#123A8F] bg-[#123A8F] text-white'
                          : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40'
                      )}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-primary/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
                <Info className="mb-1 h-3.5 w-3.5 text-primary" />
                Predictions are generated using a fusion of Sentinel-5P TROPOMI and local CPCB ground station data via the ISRO-Aero-Net model.
              </div>

              <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF7A00] py-3 text-sm font-700 text-white shadow transition-all hover:bg-[#e06c00] active:scale-95">
                <Download className="h-4 w-4" />
                Export Map Data
              </button>
            </div>
          </SectionCard>
        </div>

        {/* Center — map */}
        <SectionCard bodyClassName="p-0" delay={0.15}>
          <Suspense fallback={<div className="flex h-[520px] items-center justify-center text-xs text-muted-foreground">Loading map…</div>}>
            <IndiaMap
              hotspots={hotspots}
              showFires={false}
              showHeatmap
              opacity={opacity / 100}
              height="580px"
              legendItems={[
                { label: 'Good (0-50)', color: '#22C55E' },
                { label: 'Satisfactory (51-100)', color: '#84CC16' },
                { label: 'Moderate (101-200)', color: '#F59E0B' },
                { label: 'Poor (201-300)', color: '#EF4444' },
                { label: 'Very Poor (301-400)', color: '#991B1B' },
                { label: 'Severe (>401)', color: '#4C0519' },
              ]}
            />
          </Suspense>
          <div className="border-t border-border px-5 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">
              Predictive Model: AeroNet-v3 · Deep Learning Ensemble · Last trained: 14h ago
            </p>
          </div>
        </SectionCard>

        {/* Right — station info */}
        <div className="flex flex-col gap-4">
          <SectionCard delay={0.2}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive pulse-ring" />
                <span className="text-sm font-700">Station: Anand Vihar</span>
              </div>
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-700 text-destructive">Live Alert</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                { label: 'Current AQI', value: '384', sub: 'Very Poor' },
                { label: '24H Average', value: '342 µg/m³', sub: '' },
                { label: 'Wind Speed', value: '4.2 km/h', sub: '' },
                { label: 'Humidity', value: '62% RH', sub: '' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-muted/40 p-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
                  <div className="mt-0.5 text-base font-700">{s.value}</div>
                  {s.sub && <div className="text-[10px] text-muted-foreground">{s.sub}</div>}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Prediction Accuracy" icon={<Target className="h-4 w-4" />} delay={0.25}>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={predAcc} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="t" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} domain={[100, 260]} />
                <RTooltip contentStyle={{ borderRadius: 12, fontSize: 10 }} />
                <Line type="monotone" dataKey="predicted" stroke="#123A8F" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ground" stroke="#FF7A00" strokeWidth={2} strokeDasharray="5 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 flex justify-around border-t border-border pt-2 text-center text-xs">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">MAE</div>
                <div className="font-700">12.1</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">RMSE</div>
                <div className="font-700">15.8</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">R²</div>
                <div className="font-700">0.89</div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Contributing Factors" icon={<Wind className="h-4 w-4" />} delay={0.3}>
            <div className="space-y-2">
              {[
                { label: 'Stubble Burning Contribution', pct: 42, color: '#EF4444', tag: 'High (42%)' },
                { label: 'Vehicle Emission Density', pct: 28, color: '#F97316', tag: 'Moderate (28%)' },
                { label: 'Industrial Emissions', pct: 18, color: '#F59E0B', tag: '18%' },
                { label: 'Wind Transport', pct: 12, color: '#84CC16', tag: '12%' },
              ].map((f) => (
                <div key={f.label}>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-700 text-white" style={{ backgroundColor: f.color }}>
                      {f.tag}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${f.pct}%` }}
                      transition={{ duration: 0.8, delay: 0.5 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: f.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full rounded-xl bg-[#0d1f44] py-2.5 text-xs font-700 text-white hover:bg-[#123A8F]">
              Analyze Station Trends
            </button>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
