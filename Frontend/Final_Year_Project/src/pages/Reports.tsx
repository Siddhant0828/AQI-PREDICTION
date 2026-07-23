import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Shield, CheckSquare, Square } from 'lucide-react';
import { SectionCard } from '@/components/SectionCard';
import reportsData from '@/data/reports.json';
import { cn } from '@/lib/utils';

const TABLE_DATA = [
  { region: 'Punjab & Haryana', avgAqi: 245, hcho: '12.5e-5', fires: 842, risk: 'Critical', riskColor: '#EF4444' },
  { region: 'Delhi NCR', avgAqi: 312, hcho: '10.2e-5', fires: 12, risk: 'Severe', riskColor: '#991B1B' },
  { region: 'Uttar Pradesh', avgAqi: 184, hcho: '14.8e-5', fires: 350, risk: 'High', riskColor: '#F97316' },
  { region: 'Bihar', avgAqi: 156, hcho: '8.4e-5', fires: 42, risk: 'Moderate', riskColor: '#F59E0B' },
  { region: 'West Bengal', avgAqi: 92, hcho: '6.1e-5', fires: 8, risk: 'Low', riskColor: '#22C55E' },
];

export function Reports() {
  const [selectedRegion, setSelectedRegion] = useState('Indo-Gangetic Plain (Custom Polygon)');
  const [dateRange] = useState('01 Aug 2024 — 24 Aug 2024');
  const [indicators, setIndicators] = useState<string[]>(['Surface AQI (Blended)', 'HCHO Column Density', 'Active Fire Hotspots']);
  const [metContext, setMetContext] = useState<string[]>(['Wind Vector Field', 'Relative Humidity', 'Boundary Layer Height']);
  const [format, setFormat] = useState('OFFICIAL PDF');
  const [generating, setGenerating] = useState(false);

  const toggleIndicator = (item: string) => {
    setIndicators((prev) => prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]);
  };
  const toggleMet = (item: string) => {
    setMetContext((prev) => prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]);
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => setGenerating(false), 1800);
  };

  const INDICATOR_LIST = ['Surface AQI (Blended)', 'HCHO Column Density', 'Active Fire Hotspots'];
  const MET_LIST = ['Wind Vector Field', 'Relative Humidity', 'Boundary Layer Height'];
  const FORMAT_LIST = ['OFFICIAL PDF', 'CSV DATA', 'GEOJSON'];

  return (
    <div className="space-y-4">
      {/* Sub-header */}
      <div className="flex items-center justify-between rounded-[18px] border border-border bg-card px-4 py-2.5 card-shadow">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-700 text-primary">Live Preview</span>
          <span className="text-[12px] text-muted-foreground">Auto-updating assembly of selected metrics</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-600 text-emerald-600">System Synced</span>
          </div>
          <button className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-600 hover:border-primary/40 hover:bg-primary/5">
            <Download className="h-3.5 w-3.5" />
            Quick Export
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        {/* Left — configuration */}
        <div className="flex flex-col gap-4">
          <SectionCard title="Report Configuration" subtitle="Define spatial and temporal bounds for documentation." icon={<FileText className="h-4 w-4" />}>
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-[11px] font-700 uppercase tracking-wide text-primary">Geographical Boundary</div>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option>Indo-Gangetic Plain (Custom Polygon)</option>
                  {reportsData.regions.map((r) => <option key={r}>{r}</option>)}
                </select>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Latitude Range</label>
                    <input
                      type="text"
                      defaultValue="20.5 - 30.2"
                      className="w-full rounded-lg border border-border bg-muted/40 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Longitude Range</label>
                    <input
                      type="text"
                      defaultValue="75.1 - 88.5"
                      className="w-full rounded-lg border border-border bg-muted/40 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-[11px] font-700 uppercase tracking-wide text-primary">Temporal Scope</div>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs">
                  <span>{dateRange}</span>
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">24 days (Current Monsoon Transition)</div>
              </div>

              <div>
                <div className="mb-2 text-[11px] font-700 uppercase tracking-wide text-primary">Environmental Indicators</div>
                <div className="space-y-2">
                  {INDICATOR_LIST.map((item) => (
                    <label key={item} className="flex cursor-pointer items-center gap-2 text-xs">
                      {indicators.includes(item) ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                      <input type="checkbox" className="sr-only" onChange={() => toggleIndicator(item)} checked={indicators.includes(item)} />
                      {item}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[11px] font-700 uppercase tracking-wide text-primary">Meteorological Context</div>
                <div className="space-y-2">
                  {MET_LIST.map((item) => (
                    <label key={item} className="flex cursor-pointer items-center gap-2 text-xs">
                      {metContext.includes(item) ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                      <input type="checkbox" className="sr-only" onChange={() => toggleMet(item)} checked={metContext.includes(item)} />
                      {item}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[11px] font-700 uppercase tracking-wide text-primary">Export Preferences</div>
                <div className="grid grid-cols-3 gap-2">
                  {FORMAT_LIST.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[9px] font-700 transition-all',
                        f === format
                          ? 'border-[#123A8F] bg-[#123A8F]/10 text-[#123A8F]'
                          : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40'
                      )}
                    >
                      <FileText className="h-4 w-4" />
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs">
                <CheckSquare className="h-4 w-4 text-primary" />
                Include Technical Methodology
                <span className="ml-auto text-[10px] text-muted-foreground">Appendix: fusion model details</span>
              </label>

              <button
                onClick={handleGenerate}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF7A00] py-3 text-sm font-700 text-white hover:bg-[#e06c00] active:scale-95 transition-all"
              >
                <Download className="h-4 w-4" />
                {generating ? 'Generating…' : 'Generate & Download Report'}
              </button>
            </div>
          </SectionCard>
        </div>

        {/* Right — preview */}
        <motion.div
          className="overflow-hidden rounded-[18px] border border-border bg-card card-shadow"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {/* Report header */}
          <div className="border-b border-border bg-gradient-to-r from-[#0d1f44] to-[#123A8F] px-8 py-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#FF7A00]" />
                <div className="text-sm font-700">AeroSense India Official Report</div>
              </div>
              <span className="rounded-full border border-white/30 px-3 py-1 text-[10px] font-700">Confidential / Internal Use</span>
            </div>
            <h3 className="mt-3 text-2xl font-700 leading-tight">
              National Air Quality &<br />Formaldehyde Analysis
            </h3>
            <p className="mt-2 text-sm text-white/70">
              Comprehensive situational documentation for the Ministry of Earth Sciences and ISRO NRSC archives.
            </p>
            <div className="mt-4 grid grid-cols-4 gap-4 text-[10px]">
              {[
                { l: 'Report ID', v: 'ASI-2024-0982-X' },
                { l: 'Generated', v: '24 Aug 2024' },
                { l: 'Region', v: 'Indo-Gangetic Plain' },
                { l: 'Classification', v: 'Operational' },
              ].map((i) => (
                <div key={i.l}>
                  <div className="text-white/60">{i.l}</div>
                  <div className="font-600">{i.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Avg AQI Index', value: '184', sub: '+12%', color: '#F97316' },
                { label: 'HCHO Density', value: '14.2', sub: 'Normal', color: '#123A8F' },
                { label: 'Active Fire Points', value: '1,204', sub: '+41%', color: '#EF4444' },
                { label: 'Affected Pop.', value: '142M', sub: 'Stable', color: '#22C55E' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
                  <div className="text-xl font-700" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Map previews */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Surface AQI Heatmap', sub: 'Source: Sentinel-5P Blended', badge: 'PAN-INDIA EXTENT', gradient: 'from-emerald-400 via-orange-400 to-red-600' },
                { label: 'HCHO Column Density', sub: 'Source: TROPOMI L2', badge: 'HOTSPOT OVERLAY', gradient: 'from-sky-400 via-yellow-400 to-red-600' },
              ].map((m) => (
                <div key={m.label} className="rounded-xl overflow-hidden border border-border">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border">
                    <span className="text-xs font-700">{m.label}</span>
                    <span className="text-[10px] text-muted-foreground">{m.sub}</span>
                  </div>
                  <div className={cn('h-28 bg-gradient-to-br relative flex items-center justify-center', m.gradient)}>
                    <div className="text-3xl font-700 text-white/30">India</div>
                    <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-[9px] font-700 text-white">
                      {m.badge}
                    </span>
                  </div>
                  <div className="flex justify-between px-3 py-1 bg-muted/20">
                    <span className="text-[9px] text-muted-foreground">Low</span>
                    <div className={cn('h-2 w-24 rounded-full bg-gradient-to-r', m.gradient)} />
                    <span className="text-[9px] text-muted-foreground">Very High</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div>
              <div className="mb-2 text-sm font-700">Regional Environmental Metrics Breakdown</div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 text-left font-600">Sub-Region</th>
                    <th className="pb-2 text-right font-600">Avg AQI</th>
                    <th className="pb-2 text-right font-600">HCHO</th>
                    <th className="pb-2 text-right font-600">Fires</th>
                    <th className="pb-2 text-right font-600">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {TABLE_DATA.map((row) => (
                    <tr key={row.region} className="border-b border-border/60 last:border-0">
                      <td className="py-2 font-500">{row.region}</td>
                      <td className="py-2 text-right font-700">{row.avgAqi}</td>
                      <td className="py-2 text-right text-muted-foreground">{row.hcho}</td>
                      <td className="py-2 text-right text-muted-foreground">{row.fires}</td>
                      <td className="py-2 text-right">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-700 text-white"
                          style={{ backgroundColor: row.riskColor }}
                        >
                          {row.risk}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Methodology */}
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-700">
                Scientific Methodology & Data Fusion
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                This report utilizes a hybrid data fusion model combining Level-2 TROPOMI (Sentinel-5P) Formaldehyde column densities with ground-truth particulate matter measurements from the CPCB (Central Pollution Control Board) real-time monitoring network. Fire activity is derived from the MODIS (Terra/Aqua) Thermal Anomalies product. Spatial interpolation is performed using a Random Forest Regressor trained on 10 years of historic IMD/A meteorological reanalysis data, achieving an R² of 0.85 across the Indo-Gangetic Plain.
              </p>
            </div>

            <div className="text-center text-[10px] text-muted-foreground border-t border-border pt-3">
              © 2024 ISRO Bharatiya Antariksh Hackathon // Generated by AeroSense India AI &nbsp;&nbsp; Page 01 of 01
            </div>
          </div>

          <div className="flex items-center justify-center border-t border-border py-6">
            <div className="flex flex-col items-center gap-1.5 text-center text-muted-foreground">
              <FileText className="h-8 w-8 opacity-25" />
              <div className="text-[11px]">Appendices and Raw Data Tables</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
