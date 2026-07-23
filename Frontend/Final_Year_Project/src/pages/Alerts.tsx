import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, Download, FileText, Mail, Smartphone, ChevronRight } from 'lucide-react';
import { SectionCard } from '@/components/SectionCard';
import alertsData from '@/data/alerts.json';
import { cn } from '@/lib/utils';

type Severity = 'red' | 'orange' | 'yellow';

function SeverityTag({ severity }: { severity: Severity }) {
  const map: Record<Severity, { cls: string; label: string }> = {
    red: { cls: 'bg-destructive text-white', label: 'Severe' },
    orange: { cls: 'bg-orange-500 text-white', label: 'High' },
    yellow: { cls: 'bg-yellow-400 text-foreground', label: 'Moderate' },
  };
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-700 uppercase tracking-wide', map[severity].cls)}>
      {map[severity].label}
    </span>
  );
}

export function Alerts() {
  const [selected, setSelected] = useState(alertsData.alerts[0]);
  const [filter, setFilter] = useState<Severity | 'all'>('all');

  const filtered = filter === 'all'
    ? alertsData.alerts
    : alertsData.alerts.filter((a) => a.severity === filter);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-700">Alerts & Advisory</h2>
          <p className="text-sm text-muted-foreground">Real-time notifications and emergency advisories</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 rounded-xl bg-[#FF7A00] px-3 py-2 text-xs font-700 text-white hover:bg-[#e06c00]">
            <FileText className="h-3.5 w-3.5" />
            Publish National Advisory
          </button>
          <button className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-600 hover:border-primary/40 hover:bg-primary/5">
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(['all', 'red', 'orange', 'yellow'] as const).map((f) => {
          const labels: Record<typeof f, string> = { all: 'All', red: 'Severe', orange: 'High', yellow: 'Moderate' };
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-600 border transition-all',
                filter === f
                  ? 'bg-[#123A8F] text-white border-[#123A8F]'
                  : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40'
              )}
            >
              {labels[f]}
            </button>
          );
        })}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} alerts</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* Alert feed */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((alert) => (
              <motion.div
                key={alert.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                onClick={() => setSelected(alert)}
                className={cn(
                  'cursor-pointer rounded-[18px] border bg-card p-4 card-shadow transition-all hover:shadow-md',
                  selected.id === alert.id ? 'border-primary/60 shadow-[0_0_0_2px_rgba(18,58,143,0.15)]' : 'border-border'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full',
                      alert.severity === 'red' ? 'bg-destructive pulse-ring' : alert.severity === 'orange' ? 'bg-orange-500' : 'bg-yellow-400'
                    )} />
                    <div>
                      <div className="text-sm font-700 leading-tight">{alert.title}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{alert.region} · {alert.time}</div>
                      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground line-clamp-2">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <SeverityTag severity={alert.severity as Severity} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-border pt-2">
                  <span className="rounded-lg bg-muted/60 px-2 py-0.5 text-[10px] font-700">AQI {alert.aqi}</span>
                  <div className="flex items-center gap-2 ml-auto text-[10px] text-muted-foreground">
                    {alert.channels.sms && <Smartphone className="h-3.5 w-3.5 text-primary" />}
                    {alert.channels.email && <Mail className="h-3.5 w-3.5 text-primary" />}
                    {alert.channels.push && <BellRing className="h-3.5 w-3.5 text-primary" />}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4">
          {/* Detail card */}
          <SectionCard title={selected.title} action={<SeverityTag severity={selected.severity as Severity} />}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-muted/40 p-2.5">
                  <div className="text-[10px] text-muted-foreground">Region</div>
                  <div className="text-xs font-700">{selected.region}</div>
                </div>
                <div className="rounded-xl bg-muted/40 p-2.5">
                  <div className="text-[10px] text-muted-foreground">Current AQI</div>
                  <div className="text-xs font-700 text-destructive">{selected.aqi}</div>
                </div>
              </div>
              <p className="text-[12px] leading-relaxed text-muted-foreground">{selected.description}</p>

              <div className="rounded-xl border border-border p-3">
                <div className="mb-2 text-[11px] font-700 uppercase tracking-wide text-muted-foreground">Notification Channels</div>
                <div className="flex gap-3">
                  {[
                    { icon: Smartphone, label: 'SMS', active: selected.channels.sms },
                    { icon: Mail, label: 'Email', active: selected.channels.email },
                    { icon: BellRing, label: 'Push', active: selected.channels.push },
                  ].map((ch) => (
                    <div
                      key={ch.label}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-600',
                        ch.active ? 'bg-primary/10 text-primary' : 'bg-muted/40 text-muted-foreground'
                      )}
                    >
                      <ch.icon className="h-3.5 w-3.5" />
                      {ch.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 rounded-xl bg-[#FF7A00] py-2.5 text-xs font-700 text-white hover:bg-[#e06c00]">
                  Escalate
                </button>
                <button className="flex-1 rounded-xl border border-border py-2.5 text-xs font-600 hover:border-primary/40 hover:bg-primary/5">
                  Mark Resolved
                </button>
              </div>
            </div>
          </SectionCard>

          {/* Daily summary */}
          <SectionCard title="Daily Summary">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Alerts Issued', value: alertsData.dailySummary.alertsIssued },
                { label: 'Regions Covered', value: alertsData.dailySummary.regionsCovered },
                { label: 'Red Alerts', value: alertsData.dailySummary.redAlerts, color: 'text-destructive' },
                { label: 'Orange Alerts', value: alertsData.dailySummary.orangeAlerts, color: 'text-orange-500' },
                { label: 'Yellow Alerts', value: alertsData.dailySummary.yellowAlerts, color: 'text-yellow-500' },
                { label: 'Reach', value: '4.8 Cr', sub: 'people' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-muted/40 p-2.5">
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  <div className={cn('text-sm font-700', s.color)}>{s.value}</div>
                  {s.sub && <div className="text-[10px] text-muted-foreground">{s.sub}</div>}
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Emergency panel */}
          <div className="rounded-[18px] border border-destructive/30 bg-destructive/5 p-4">
            <div className="mb-2 text-[11px] font-700 uppercase tracking-wide text-destructive">Emergency Response Panel</div>
            <button className="mb-2 flex w-full items-center justify-between rounded-xl bg-destructive px-4 py-3 text-xs font-700 text-white hover:bg-red-700">
              Issue National Emergency Advisory
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2 text-[11px] font-600 hover:border-primary/40">
                <Download className="h-3.5 w-3.5" /> PDF
              </button>
              <button className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2 text-[11px] font-600 hover:border-primary/40">
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
