import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Satellite, ChevronDown, Bell, Share2, Download, Moon, Sun, Calendar,
  Search, User, LogOut, Settings as SettingsIcon, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { CpcbToggleSwitch } from '@/hooks/use-cpcb-mode';

export function Navbar({ dark, onToggleDark }: { dark: boolean; onToggleDark: () => void }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [region, setRegion] = useState('National — India');
  const [regionOpen, setRegionOpen] = useState(false);
  const [date, setDate] = useState('2026-07-18');
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const regions = ['National — India', 'Delhi NCR', 'Indo-Gangetic Plain', 'Maharashtra', 'Telangana', 'West Bengal'];

  const displayName = (user?.user_metadata?.full_name as string) || user?.email?.split('@')[0] || 'Analyst';
  const initials = displayName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-20 h-16 border-b border-border bg-white/90 backdrop-blur-md dark:bg-card/90 md:left-64">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3 md:hidden">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-[#FF7A00] to-[#ff9d40]">
            <Satellite className="h-4 w-4 text-white" />
          </div>
          <div className="text-sm font-bold">AeroSense</div>
        </div>

        <div className="hidden flex-col md:flex">
          <h1 className="text-[15px] font-bold leading-tight text-foreground">AeroSense India</h1>
          <p className="text-[11px] text-muted-foreground">Satellite-Based Air Quality Monitoring Platform</p>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* CPCB Station Toggle */}
          <CpcbToggleSwitch variant="compact" />
          <div className="relative hidden lg:block">
            <button
              onClick={() => setRegionOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs font-medium hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="text-primary">{region}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <AnimatePresence>
              {regionOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-1.5 card-shadow"
                >
                  {regions.map((r) => (
                    <button
                      key={r}
                      onClick={() => { setRegion(r); setRegionOpen(false); }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-primary/5',
                        r === region && 'bg-primary/10 text-primary'
                      )}
                    >
                      {r}
                      {r === region && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs font-medium xl:flex">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-xs outline-none"
            />
          </div>

          <button className="hidden rounded-xl border border-border bg-muted/40 p-2 hover:border-primary/40 hover:bg-primary/5 sm:block">
            <Search className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="relative rounded-xl border border-border bg-muted/40 p-2 hover:border-primary/40 hover:bg-primary/5"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                3
              </span>
            </button>
            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card p-2 card-shadow"
                >
                  <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Notifications</div>
                  {[
                    { t: 'Severe AQI Spike — Delhi NCR', d: '12 min ago', s: 'red' },
                    { t: 'Fire cluster detected — Punjab', d: '1 hr ago', s: 'orange' },
                    { t: 'HCHO hotspot — Vidarbha', d: '3 hr ago', s: 'yellow' },
                  ].map((n) => (
                    <div key={n.t} className="flex gap-2 rounded-lg p-2 hover:bg-muted/50">
                      <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', n.s === 'red' ? 'bg-destructive' : n.s === 'orange' ? 'bg-warning' : 'bg-yellow-400')} />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold">{n.t}</div>
                        <div className="text-[10px] text-muted-foreground">{n.d}</div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button className="hidden rounded-xl border border-border bg-muted/40 p-2 hover:border-primary/40 hover:bg-primary/5 sm:block">
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="hidden rounded-xl border border-border bg-muted/40 p-2 hover:border-primary/40 hover:bg-primary/5 sm:block">
            <Download className="h-4 w-4 text-muted-foreground" />
          </button>

          <button
            onClick={onToggleDark}
            className="rounded-xl border border-border bg-muted/40 p-2 hover:border-primary/40 hover:bg-primary/5"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="h-4 w-4 text-warning" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-2 py-1.5 hover:border-primary/40"
            >
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#123A8F] to-[#1d4ed8] text-[11px] font-bold text-white">
                {initials || <User className="h-3.5 w-3.5" />}
              </div>
              <div className="hidden text-left leading-tight sm:block">
                <div className="max-w-[120px] truncate text-[11px] font-bold">{displayName}</div>
                <div className="max-w-[120px] truncate text-[9px] text-muted-foreground">{user?.email}</div>
              </div>
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
            </button>
            <AnimatePresence>
              {userOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute right-0 mt-2 w-60 rounded-xl border border-border bg-card p-1.5 card-shadow"
                >
                  <div className="border-b border-border px-3 py-2.5">
                    <div className="truncate text-xs font-bold">{displayName}</div>
                    <div className="truncate text-[10px] text-muted-foreground">{user?.email}</div>
                  </div>
                  <button
                    onClick={() => { navigate('/settings'); setUserOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-primary/5"
                  >
                    <SettingsIcon className="h-4 w-4 text-muted-foreground" />
                    Settings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
