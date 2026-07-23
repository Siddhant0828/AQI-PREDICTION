import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell, User, Database, Palette, Globe, Moon, Sun, Save, RotateCcw,
  Check, LogOut, Mail, Building2, Shield,
} from 'lucide-react';
import { SectionCard } from '@/components/SectionCard';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';

const ACCENT_COLORS = [
  { name: 'Navy', value: '#123A8F' },
  { name: 'Orange', value: '#FF7A00' },
  { name: 'Emerald', value: '#22C55E' },
  { name: 'Rose', value: '#E11D48' },
  { name: 'Cyan', value: '#0891B2' },
  { name: 'Amber', value: '#F59E0B' },
];

const REGIONS = ['National — India', 'Delhi NCR', 'Indo-Gangetic Plain', 'Maharashtra', 'Telangana'];
const REFRESH_INTERVALS = ['1 minute', '5 minutes', '15 minutes', '30 minutes', '1 hour'];
const EXPORT_FORMATS = ['PDF', 'CSV', 'GeoJSON', 'PNG'];

export function Settings() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { settings, update, reset } = useSettings();
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const handleSave = () => {
    showToast('Settings saved successfully');
  };
  const handleReset = () => {
    reset();
    showToast('Settings reset to defaults');
  };

  const displayName = (user?.user_metadata?.full_name as string) || 'Analyst';
  const email = user?.email || '—';
  const initials = displayName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Settings</h2>
          <p className="text-sm text-muted-foreground">Manage your account, preferences, and system configuration.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-sm font-semibold hover:border-primary/40 hover:bg-primary/5"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-xl bg-[#123A8F] px-3.5 py-2 text-sm font-bold text-white hover:bg-[#0d2b6b]"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>
      </div>

      {/* Profile banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[18px] border border-border bg-card card-shadow"
      >
        <div className="h-20 bg-gradient-to-r from-[#123A8F] via-[#1d4ed8] to-[#FF7A00]" />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end">
          <div className="-mt-8 grid h-16 w-16 place-items-center rounded-2xl border-4 border-card bg-gradient-to-br from-[#123A8F] to-[#1d4ed8] text-xl font-bold text-white shadow-lg">
            {initials}
          </div>
          <div className="flex-1">
            <div className="text-base font-bold">{displayName}</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              {email}
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </motion.div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {/* Profile & Access */}
        <SectionCard title="Profile & Access" icon={<User className="h-4 w-4" />} delay={0}>
          <div className="space-y-3">
            <Field label="Full Name" icon={<User className="h-3.5 w-3.5" />} value={displayName} onChange={() => {}} />
            <Field label="Email" icon={<Mail className="h-3.5 w-3.5" />} value={email} onChange={() => {}} readOnly />
            <Field label="Role" icon={<Shield className="h-3.5 w-3.5" />} value="Mission Control" onChange={() => {}} readOnly />
            <Field label="Organization" icon={<Building2 className="h-3.5 w-3.5" />} value="ISRO / NRSC" onChange={() => {}} readOnly />
          </div>
        </SectionCard>

        {/* Notifications */}
        <SectionCard title="Notification Preferences" icon={<Bell className="h-4 w-4" />} delay={0.08}>
          <div className="space-y-3">
            <Toggle
              label="AQI Threshold Alert (> 150)"
              on={settings.aqiThresholdAlerts}
              onToggle={(v) => update('aqiThresholdAlerts', v)}
            />
            <Toggle
              label="Fire Detection Notifications"
              on={settings.fireDetectionAlerts}
              onToggle={(v) => update('fireDetectionAlerts', v)}
            />
            <Toggle
              label="Pipeline Failure Alerts"
              on={settings.pipelineFailureAlerts}
              onToggle={(v) => update('pipelineFailureAlerts', v)}
            />
            <Toggle
              label="Daily Report Digest"
              on={settings.dailyReportDigest}
              onToggle={(v) => update('dailyReportDigest', v)}
            />
          </div>
        </SectionCard>

        {/* Appearance */}
        <SectionCard title="Appearance" icon={<Palette className="h-4 w-4" />} delay={0.16}>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-[11px] font-medium text-muted-foreground">Theme</label>
              <button
                onClick={toggleTheme}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs font-medium hover:bg-primary/5"
              >
                <span className="flex items-center gap-2">
                  {theme === 'dark' ? <Moon className="h-4 w-4 text-[#60a5fa]" /> : <Sun className="h-4 w-4 text-warning" />}
                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </span>
                <span className={cn(
                  'relative h-5 w-9 rounded-full transition-colors',
                  theme === 'dark' ? 'bg-[#123A8F]' : 'bg-muted'
                )}>
                  <span className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                    theme === 'dark' ? 'left-4' : 'left-0.5'
                  )} />
                </span>
              </button>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-medium text-muted-foreground">Accent Color</label>
              <div className="flex flex-wrap gap-2">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => update('accentColor', c.value)}
                    title={c.name}
                    className={cn(
                      'grid h-8 w-8 place-items-center rounded-full border-2 transition-all hover:scale-110',
                      settings.accentColor === c.value ? 'border-foreground scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c.value }}
                  >
                    {settings.accentColor === c.value && <Check className="h-4 w-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-[11px] font-medium text-muted-foreground">Font Scale</label>
                <span className="text-[11px] font-bold">{settings.fontScale}%</span>
              </div>
              <input
                type="range"
                min={80}
                max={120}
                value={settings.fontScale}
                onChange={(e) => update('fontScale', Number(e.target.value))}
                className="w-full accent-[#123A8F]"
              />
              <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
                <span>A</span><span>A</span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Data & Integration */}
        <SectionCard title="Data & Integration" icon={<Database className="h-4 w-4" />} delay={0.24}>
          <div className="space-y-3">
            <SelectField
              label="Default Region"
              value={settings.defaultRegion}
              options={REGIONS}
              onChange={(v) => update('defaultRegion', v)}
            />
            <SelectField
              label="Data Refresh Interval"
              value={settings.refreshInterval}
              options={REFRESH_INTERVALS}
              onChange={(v) => update('refreshInterval', v)}
            />
            <SelectField
              label="Default Export Format"
              value={settings.exportFormat}
              options={EXPORT_FORMATS}
              onChange={(v) => update('exportFormat', v)}
            />
          </div>
        </SectionCard>

        {/* About */}
        <SectionCard title="About AeroSense India" icon={<Globe className="h-4 w-4" />} delay={0.32}>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            {[
              ['Version', 'v1.0.0'],
              ['Model', 'AeroNet-v3'],
              ['Developed by', 'ISRO / NRSC'],
              ['Data Partners', 'CPCB, ESA, NASA'],
              ['Methodology', 'v2.4'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span>{k}</span>
                <span className="font-bold text-foreground">{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl bg-primary/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
            AeroSense India is an ISRO Bharatiya Antariksh Hackathon project leveraging satellite-based AI for national air quality surveillance.
          </div>
        </SectionCard>
      </div>

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-success/30 bg-card px-4 py-2.5 text-sm font-semibold text-success card-shadow"
        >
          <Check className="h-4 w-4" />
          {toast}
        </motion.div>
      )}
    </div>
  );
}

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: (v: boolean) => void }) {
  return (
    <button onClick={() => onToggle(!on)} className="flex w-full items-center justify-between text-left">
      <span className="text-xs">{label}</span>
      <span className={cn(
        'relative h-5 w-9 rounded-full transition-colors',
        on ? 'bg-[#123A8F]' : 'bg-muted'
      )}>
        <span className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
          on ? 'left-4' : 'left-0.5'
        )} />
      </span>
    </button>
  );
}

function Field({
  label, icon, value, onChange, readOnly,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
        {icon}
        {label}
      </label>
      <input
        type="text"
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary',
          readOnly && 'cursor-not-allowed opacity-70'
        )}
      />
    </div>
  );
}

function SelectField({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
