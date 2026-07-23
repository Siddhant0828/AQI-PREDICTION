import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Satellite, Server, Database, Cpu, CheckCircle, Clock,
  RefreshCw, Activity, Wifi
} from 'lucide-react';
import { SectionCard } from '@/components/SectionCard';
import { cn } from '@/lib/utils';

type StageStatus = 'complete' | 'running' | 'queued';

interface Stage {
  id: string;
  name: string;
  description: string;
  status: StageStatus;
  progress: number;
  duration: string;
  icon: typeof Satellite;
}

const stages: Stage[] = [
  { id: 's1', name: 'Satellite Data Ingestion', description: 'INSAT-3DR, Sentinel-5P, MODIS raw L1 data', status: 'complete', progress: 100, duration: '2m 14s', icon: Satellite },
  { id: 's2', name: 'Preprocessing & QC', description: 'Geometric correction, cloud masking, outlier rejection', status: 'complete', progress: 100, duration: '3m 42s', icon: RefreshCw },
  { id: 's3', name: 'Feature Engineering', description: 'HCHO column density, fire radiative power, AOD', status: 'complete', progress: 100, duration: '1m 58s', icon: Database },
  { id: 's4', name: 'AI Prediction (AeroNet-v3)', description: 'Random Forest + Deep Learning ensemble inference', status: 'running', progress: 67, duration: '~2m left', icon: Cpu },
  { id: 's5', name: 'Validation & Cross-check', description: 'CPCB ground truth comparison, R² verification', status: 'queued', progress: 0, duration: 'Pending', icon: CheckCircle },
  { id: 's6', name: 'Output Products', description: 'GeoTIFF heatmap, JSON API, advisory generation', status: 'queued', progress: 0, duration: 'Pending', icon: Activity },
  { id: 's7', name: 'Publication & Distribution', description: 'CPCB portal, NRSC archive, SMS/push broadcast', status: 'queued', progress: 0, duration: 'Pending', icon: Wifi },
];

const dataSources = [
  { name: 'INSAT-3DR', type: 'Geostationary', status: 'operational', lastSync: '2 min ago', coverage: 98, icon: Satellite },
  { name: 'Sentinel-5P', type: 'TROPOMI', status: 'operational', lastSync: '11 min ago', coverage: 94, icon: Satellite },
  { name: 'CPCB Network', type: 'Ground Stations', status: 'operational', lastSync: '1 min ago', coverage: 91, icon: Database },
  { name: 'MODIS Aqua', type: 'Fire / AOD', status: 'degraded', lastSync: '34 min ago', coverage: 78, icon: Satellite },
  { name: 'ERA5 Reanalysis', type: 'Meteorological', status: 'operational', lastSync: '5 min ago', coverage: 99, icon: Server },
];

function StatusIcon({ status }: { status: StageStatus }) {
  if (status === 'complete') return <CheckCircle className="h-5 w-5 text-emerald-500" />;
  if (status === 'running') return <RefreshCw className="h-5 w-5 animate-spin text-[#123A8F]" />;
  return <Clock className="h-5 w-5 text-muted-foreground" />;
}

export function Pipeline() {
  const [runProg, setRunProg] = useState(67);
  useEffect(() => {
    const t = setInterval(() => {
      setRunProg((v) => Math.min(v + 0.5, 99));
    }, 400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-700">Pipeline Status</h2>
          <p className="text-sm text-muted-foreground">End-to-end data processing and publication workflow</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-xl bg-[#123A8F] px-3 py-2 text-xs font-700 text-white hover:bg-[#0d2b6b]">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Status
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        {/* Pipeline visual */}
        <SectionCard title="Processing Pipeline" subtitle="AeroNet-v3 · Run #2024-11-12-0815 IST" delay={0.1}>
          <div className="space-y-0">
            {stages.map((stage, i) => {
              const prog = stage.status === 'running' ? runProg : stage.progress;
              return (
                <div key={stage.id}>
                  <motion.div
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className={cn(
                      'flex items-start gap-4 rounded-xl p-3 transition-all',
                      stage.status === 'running' && 'bg-primary/5 border border-primary/20'
                    )}
                  >
                    <div className={cn(
                      'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl',
                      stage.status === 'complete' ? 'bg-emerald-500/10' :
                      stage.status === 'running' ? 'bg-primary/10' :
                      'bg-muted/60'
                    )}>
                      <stage.icon className={cn(
                        'h-4 w-4',
                        stage.status === 'complete' ? 'text-emerald-500' :
                        stage.status === 'running' ? 'text-primary' :
                        'text-muted-foreground'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-700">{stage.name}</div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn(
                            'text-[10px] font-600',
                            stage.status === 'complete' ? 'text-emerald-500' :
                            stage.status === 'running' ? 'text-primary' :
                            'text-muted-foreground'
                          )}>
                            {stage.status === 'running' ? prog.toFixed(1) + '%' : stage.duration}
                          </span>
                          <StatusIcon status={stage.status} />
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground">{stage.description}</div>
                      {(stage.status === 'running' || stage.status === 'complete') && (
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${prog}%` }}
                            transition={{ duration: 0.3 }}
                            className={cn(
                              'h-full rounded-full',
                              stage.status === 'complete' ? 'bg-emerald-500' : 'bg-primary'
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                  {i < stages.length - 1 && (
                    <div className="ml-[26px] flex items-center gap-2 py-1">
                      <div className={cn(
                        'ml-3 h-5 w-[2px]',
                        i < stages.findIndex(s => s.status === 'running')
                          ? 'bg-emerald-500'
                          : i === stages.findIndex(s => s.status === 'running')
                          ? 'bg-gradient-to-b from-emerald-500 to-muted'
                          : 'bg-muted'
                      )} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Right — data sources + system health */}
        <div className="flex flex-col gap-4">
          <SectionCard title="Data Source Status" subtitle="Real-time satellite and ground data feeds" delay={0.15}>
            <div className="space-y-3">
              {dataSources.map((ds) => (
                <div key={ds.name} className="rounded-xl bg-muted/30 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'h-2 w-2 rounded-full',
                        ds.status === 'operational' ? 'bg-emerald-500' :
                        ds.status === 'degraded' ? 'bg-yellow-400' : 'bg-destructive'
                      )} />
                      <div>
                        <div className="text-xs font-700">{ds.name}</div>
                        <div className="text-[10px] text-muted-foreground">{ds.type}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        'text-[10px] font-700 capitalize',
                        ds.status === 'operational' ? 'text-emerald-500' :
                        ds.status === 'degraded' ? 'text-yellow-500' : 'text-destructive'
                      )}>
                        {ds.status}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{ds.lastSync}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full', ds.status === 'operational' ? 'bg-emerald-500' : 'bg-yellow-400')}
                        style={{ width: `${ds.coverage}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-700">{ds.coverage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="System Health" delay={0.25}>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'CPU Usage', value: '34%', color: 'text-emerald-500' },
                { label: 'Memory', value: '62%', color: 'text-primary' },
                { label: 'GPU Utilization', value: '87%', color: 'text-[#FF7A00]' },
                { label: 'Uptime', value: '99.8%', color: 'text-emerald-500' },
                { label: 'Queue', value: '2 jobs', color: 'text-muted-foreground' },
                { label: 'Model Latency', value: '12ms', color: 'text-emerald-500' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-muted/40 p-2.5">
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  <div className={cn('text-sm font-700', s.color)}>{s.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-600 text-emerald-600">All critical services operational</span>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
