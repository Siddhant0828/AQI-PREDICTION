import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Sparkles, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CpcbModeContextValue {
  showCpcb: boolean;
  toggleCpcb: () => void;
  setShowCpcb: (val: boolean) => void;
}

const CpcbModeContext = createContext<CpcbModeContextValue | undefined>(undefined);

const STORAGE_KEY = 'aerosense-cpcb-mode';

export function CpcbModeProvider({ children }: { children: ReactNode }) {
  const [showCpcb, setShowCpcbState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true'; // Default is false: show model predicted AQI at all times
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(showCpcb));
  }, [showCpcb]);

  const setShowCpcb = useCallback((val: boolean) => setShowCpcbState(val), []);
  const toggleCpcb = useCallback(() => setShowCpcbState((prev) => !prev), []);

  return (
    <CpcbModeContext.Provider value={{ showCpcb, toggleCpcb, setShowCpcb }}>
      {children}
    </CpcbModeContext.Provider>
  );
}

export function useCpcbMode() {
  const ctx = useContext(CpcbModeContext);
  if (!ctx) {
    throw new Error('useCpcbMode must be used within CpcbModeProvider');
  }
  return ctx;
}

interface CpcbToggleSwitchProps {
  variant?: 'default' | 'compact' | 'pill';
  className?: string;
}

export function CpcbToggleSwitch({ variant = 'default', className }: CpcbToggleSwitchProps) {
  const { showCpcb, toggleCpcb } = useCpcbMode();

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={toggleCpcb}
        title={
          showCpcb
            ? 'CPCB Ground Station AQI is visible. Click to hide and show only Model Predicted AQI.'
            : 'Click to reveal official CPCB Ground Station AQI (AI Model AQI is shown by default).'
        }
        className={cn(
          'relative inline-flex h-8 items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-600 transition-all select-none',
          showCpcb
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-sm'
            : 'border-border bg-muted/40 text-muted-foreground hover:bg-primary/5 hover:text-foreground',
          className
        )}
      >
        {showCpcb ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">CPCB:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">ON</span>
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">CPCB:</span>
            <span className="font-medium opacity-80">OFF</span>
          </>
        )}
      </button>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleCpcb}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-all select-none shadow-sm',
          showCpcb
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
            : 'border-border bg-muted/50 text-muted-foreground hover:border-primary/40 hover:text-foreground',
          className
        )}
      >
        <span
          className={cn(
            'flex h-2 w-2 rounded-full transition-colors',
            showCpcb ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50'
          )}
        />
        <span>{showCpcb ? 'CPCB Ground Station Active' : 'Show CPCB Ground Station'}</span>
      </button>
    );
  }

  // Default interactive toggle pill with sliding switch track
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2.5 rounded-2xl border p-1.5 transition-all card-shadow select-none',
        showCpcb
          ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20'
          : 'border-border bg-card/80',
        className
      )}
    >
      <div className="flex items-center gap-1.5 pl-2 text-xs font-600">
        {showCpcb ? (
          <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Sparkles className="h-4 w-4 text-primary" />
        )}
        <div className="flex flex-col text-left">
          <span className="text-[11px] font-700 leading-tight">
            {showCpcb ? 'CPCB Ground Center' : 'Model Prediction'}
          </span>
          <span className="text-[9px] font-500 text-muted-foreground leading-tight">
            {showCpcb ? 'Physical station AQI shown' : 'All time Model AQI'}
          </span>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={showCpcb}
        onClick={toggleCpcb}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          showCpcb ? 'bg-emerald-500' : 'bg-muted-foreground/30'
        )}
        title={showCpcb ? 'Click to show AI Model AQI only' : 'Click to enable CPCB station AQI'}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
            showCpcb ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}
