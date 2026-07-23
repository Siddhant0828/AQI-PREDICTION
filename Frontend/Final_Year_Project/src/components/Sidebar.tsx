import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Wind,
  Flame,
  Factory,
  BellRing,
  FileText,
  Workflow,
  Settings,
  Satellite,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/aqi-explorer', label: 'AQI Explorer', icon: Wind },
  { to: '/hcho-analysis', label: 'HCHO Analysis', icon: Flame },
  { to: '/source-attribution', label: 'Source Attribution', icon: Factory },
  { to: '/alerts', label: 'Alerts & Advisory', icon: BellRing },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/pipeline', label: 'Pipeline Status', icon: Workflow },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ dark }: { dark: boolean }) {
  return (
    <aside className="sidebar-grad fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col text-white md:flex">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#ff9d40] glow-blue">
          <Satellite className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold tracking-wide">AeroSense India</div>
          <div className="text-[10px] font-medium text-white/60">Air Quality Monitoring</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}>
            {({ isActive }) => (
              <motion.div
                whileHover={{ x: 2 }}
                className={cn(
                  'group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-[#123A8F] text-white shadow-[0_0_18px_rgba(18,58,143,0.7)]'
                    : 'text-white/70 hover:bg-white/5 hover:text-white hover:shadow-[0_0_16px_rgba(18,58,143,0.45)]'
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{item.label}</span>
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-3 pb-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-white/50">
            <span>Satellite Uplink</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-ring" />
              Live
            </span>
          </div>
          <Satellite className="mb-2 h-14 w-full text-white/15" />
          <div className="flex items-center justify-between text-[10px] text-white/40">
            <span>Build v1.0.0</span>
            <span>ISRO · NRSC</span>
          </div>
        </div>
      </div>

      <div className={cn('pointer-events-none absolute inset-0 -z-10 opacity-30', dark && 'opacity-20')} />
    </aside>
  );
}
