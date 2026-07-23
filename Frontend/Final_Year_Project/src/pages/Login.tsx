import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Satellite, Mail, Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, Loader2, Wind, Flame, Activity, Rocket } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

type Mode = 'signin' | 'signup';

export function Login() {
  const { signIn, signUp, signInDemo } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        setLoading(false);
        return;
      }
      const { error: err } = await signUp(email, password, fullName || 'Analyst');
      setLoading(false);
      if (err) {
        setError(translateError(err));
      } else {
        setSuccess('Account created. You can now sign in.');
        setMode('signin');
        setPassword('');
      }
      return;
    }

    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) setError(translateError(err));
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a1020] text-white">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-10 h-96 w-96 rounded-full bg-[#123A8F]/30 blur-3xl" />
        <div className="absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-[#FF7A00]/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#1d4ed8]/20 blur-3xl" />
      </div>

      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        {/* Left: Brand panel */}
        <div className="hidden flex-col justify-between p-12 lg:flex">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#ff9d40] shadow-[0_0_24px_rgba(255,122,0,0.45)]">
              <Satellite className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight">AeroSense India</div>
              <div className="text-xs text-white/60">ISRO · NRSC Air Quality Platform</div>
            </div>
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl font-bold leading-tight tracking-tight">
                Satellite-based AI for
                <span className="block bg-gradient-to-r from-[#60a5fa] to-[#FF7A00] bg-clip-text text-transparent">
                  National Air Quality
                </span>
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
                Real-time AQI surveillance, HCHO hotspot detection, and fire-source attribution across India — powered by Sentinel-5P and MODIS data.
              </p>
            </motion.div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Wind, label: 'AQI Monitoring', value: '28 States' },
                { icon: Flame, label: 'Fire Detection', value: 'MODIS · VIIRS' },
                { icon: Activity, label: 'HCHO Hotspots', value: 'Live' },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                >
                  <s.icon className="h-5 w-5 text-[#60a5fa]" />
                  <div className="mt-2 text-sm font-semibold">{s.label}</div>
                  <div className="text-[11px] text-white/50">{s.value}</div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-white/40">
            <span>v1.0.0</span>
            <span>·</span>
            <span>Bharatiya Antariksh Hackathon</span>
            <span>·</span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Satellite Uplink Live
            </span>
          </div>
        </div>

        {/* Right: Auth form */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl shadow-2xl"
          >
            {/* Mobile logo */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#ff9d40]">
                <Satellite className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-base font-bold">AeroSense India</div>
                <div className="text-[11px] text-white/60">Air Quality Monitoring</div>
              </div>
            </div>

            <h2 className="text-2xl font-bold tracking-tight">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-1.5 text-sm text-white/60">
              {mode === 'signin' ? 'Sign in to access the monitoring dashboard.' : 'Join the platform to start monitoring air quality.'}
            </p>

            {/* Mode toggle */}
            <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
              {(['signin', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                  className={cn(
                    'relative rounded-lg py-2 text-sm font-semibold transition-colors',
                    mode === m ? 'text-white' : 'text-white/50 hover:text-white/80'
                  )}
                >
                  {mode === m && (
                    <motion.div
                      layoutId="mode-pill"
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#123A8F] to-[#1d4ed8]"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{m === 'signin' ? 'Sign In' : 'Sign Up'}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <AnimatePresence mode="popLayout">
                {mode === 'signup' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <Field
                      icon={<User className="h-4 w-4" />}
                      label="Full Name"
                      type="text"
                      placeholder="e.g. ISRO Analyst"
                      value={fullName}
                      onChange={setFullName}
                      autoComplete="name"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <Field
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                type="email"
                placeholder="analyst@isro.gov.in"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                required
              />

              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/70">Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#60a5fa] focus:bg-white/10 focus:ring-2 focus:ring-[#60a5fa]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{success}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#123A8F] to-[#1d4ed8] py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(18,58,143,0.4)] transition hover:shadow-[0_12px_32px_rgba(18,58,143,0.6)] disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {mode === 'signin' ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] uppercase tracking-wider text-white/40">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <button
              type="button"
              onClick={signInDemo}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#FF7A00]/40 bg-[#FF7A00]/10 py-2.5 text-sm font-semibold text-[#FF7A00] transition hover:bg-[#FF7A00]/20 hover:border-[#FF7A00]/60"
            >
              <Rocket className="h-4 w-4" />
              Explore Demo — Instant Access
            </button>

            <p className="mt-5 text-center text-[11px] text-white/40">
              Demo mode skips authentication. No email or password needed.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon, label, type, placeholder, value, onChange, autoComplete, required,
}: {
  icon: React.ReactNode;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-white/70">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#60a5fa] focus:bg-white/10 focus:ring-2 focus:ring-[#60a5fa]/30"
        />
      </div>
    </div>
  );
}

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Invalid email or password. Please try again.';
  if (m.includes('user already registered')) return 'An account with this email already exists. Try signing in.';
  if (m.includes('email rate limit')) return 'Too many attempts. Please wait a moment and try again.';
  if (m.includes('password')) return 'Password is too weak. Use at least 6 characters.';
  return msg;
}
