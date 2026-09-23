import { aqiCategory } from '@/components/AqiBadge';
import { KpiCard } from '@/components/KpiCard';
import { calculateCpcbAqi, fetchAirDataForCoordinates, LocationAirData, LocationSearch } from '@/components/LocationSearch';
import { SectionCard } from '@/components/SectionCard';
import dashData from '@/data/dashboard.json';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
    Activity,
    AlertTriangle,
    Cloud,
    Droplets,
    Eye,
    Flame,
    Loader2,
    MapPin,
    Navigation,
    RefreshCw,
    Target,
    Thermometer,
    TrendingDown,
    TrendingUp,
    Wind
} from 'lucide-react';
import { lazy, Suspense, useEffect, useState, useMemo } from 'react';
import { useCpcbMode, CpcbToggleSwitch } from '@/hooks/use-cpcb-mode';
import CountUpRaw from 'react-countup';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip as RTooltip,
    XAxis, YAxis
} from 'recharts';

const CountUp: any = typeof CountUpRaw === 'function' ? CountUpRaw : (CountUpRaw as any)?.default || CountUpRaw;

const IndiaMap = lazy(() => import('@/components/IndiaMap').then(m => ({ default: m.IndiaMap })));

const MAP_TABS = ['AQI Heatmap', 'HCHO Density', 'Fire Points', 'Wind Vectors'] as const;
type MapTab = typeof MAP_TABS[number];

interface HotspotCity {
  city: string;
  state: string;
  lat: number;
  lng: number;
  aqi: number;
  cpcb_aqi?: number | null;
  category: string;
  categoryColor: string;
  trend: number;
}

const HOTSPOT_CITIES_DEF = [
  { city: 'Delhi', state: 'Delhi', lat: 28.6542, lng: 77.2373 },
  { city: 'Ghaziabad', state: 'Uttar Pradesh', lat: 28.6692, lng: 77.4538 },
  { city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { city: 'Kanpur', state: 'Uttar Pradesh', lat: 26.4499, lng: 80.3319 },
  { city: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376 },
  { city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  { city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  { city: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
];

export function Dashboard() {
  const { showCpcb } = useCpcbMode();
  const [mapTab, setMapTab] = useState<MapTab>('AQI Heatmap');
  const [trendPeriod, setTrendPeriod] = useState<'7days' | '24days' | '1year'>('7days');

  const [activeLoc, setActiveLoc] = useState<LocationAirData | null>(null);
  const [userLoc, setUserLoc] = useState<LocationAirData | null>(null);
  const [geoLoading, setGeoLoading] = useState<boolean>(true);
  const [hotspotCities, setHotspotCities] = useState<HotspotCity[]>([]);

  const sortedHotspotCities = useMemo(() => {
    const list = [...hotspotCities];
    return list.sort((a, b) => {
      const aVal = showCpcb && a.cpcb_aqi != null ? a.cpcb_aqi : a.aqi;
      const bVal = showCpcb && b.cpcb_aqi != null ? b.cpcb_aqi : b.aqi;
      return bVal - aVal;
    });
  }, [hotspotCities, showCpcb]);

  useEffect(() => {
    let isMounted = true;

    const fetchIpLocation = async (): Promise<{ lat: number; lng: number; city?: string; region?: string } | null> => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const data = await res.json();
          if (data.latitude && data.longitude) {
            return {
              lat: data.latitude,
              lng: data.longitude,
              city: data.city,
              region: data.region,
            };
          }
        }
      } catch (e) {
        console.warn('ipapi.co lookup error:', e);
      }

      try {
        const res = await fetch('http://ip-api.com/json/');
        if (res.ok) {
          const data = await res.json();
          if (data.lat && data.lon) {
            return {
              lat: data.lat,
              lng: data.lon,
              city: data.city,
              region: data.regionName,
            };
          }
        }
      } catch (e) {
        console.warn('ip-api.com lookup error:', e);
      }

      return null;
    };

    const loadFallbackLocation = async () => {
      const ipLoc = await fetchIpLocation();
      if (ipLoc) {
        const name = ipLoc.city || 'Your Location';
        const displayName = ipLoc.city && ipLoc.region ? `${ipLoc.city}, ${ipLoc.region}, India` : `${ipLoc.lat.toFixed(4)}, ${ipLoc.lng.toFixed(4)}, India`;
        const data = await fetchAirDataForCoordinates(ipLoc.lat, ipLoc.lng, name, displayName, 'city', true);
        if (isMounted) {
          setUserLoc(data);
          setActiveLoc(data);
          setGeoLoading(false);
        }
      } else {
        const fallback = await fetchAirDataForCoordinates(28.6139, 77.2090, 'New Delhi', 'New Delhi, Delhi NCR, India', 'city', false);
        if (isMounted) {
          setActiveLoc(fallback);
          setGeoLoading(false);
        }
      }
    };

    const detectLocation = async () => {
      if (!navigator.geolocation) {
        await loadFallbackLocation();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const data = await fetchAirDataForCoordinates(latitude, longitude, undefined, undefined, undefined, true);
            if (isMounted) {
              setUserLoc(data);
              setActiveLoc(data);
              setGeoLoading(false);
            }
          } catch (e) {
            console.error('Error processing GPS location data:', e);
            await loadFallbackLocation();
          }
        },
        async (err) => {
          console.warn('Geolocation access denied or timed out:', err);
          await loadFallbackLocation();
        },
        { timeout: 7000, enableHighAccuracy: true }
      );
    };

    detectLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadHotspotCities = async () => {
      try {
        const results = await Promise.all(
          HOTSPOT_CITIES_DEF.map(async (def) => {
            const data = await fetchAirDataForCoordinates(def.lat, def.lng, def.city, `${def.city}, ${def.state}, India`, 'city', false);
            return {
              city: def.city,
              state: def.state,
              lat: def.lat,
              lng: def.lng,
              aqi: data.aqi,
              cpcb_aqi: data.cpcb_aqi,
              category: data.category,
              categoryColor: data.categoryColor,
              trend: 1,
            };
          })
        );

        results.sort((a, b) => (b.cpcb_aqi || b.aqi) - (a.cpcb_aqi || a.aqi));

        if (isMounted) {
          setHotspotCities(results);
        }
      } catch (e) {
        console.warn('Error fetching live hotspot cities:', e);
      }
    };

    loadHotspotCities();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectHotspot = async (c: { city: string; state: string; lat: number; lng: number }) => {
    try {
      const data = await fetchAirDataForCoordinates(c.lat, c.lng, c.city, `${c.city}, ${c.state}, India`, 'city', false);
      setActiveLoc(data);
    } catch (e) {
      console.error('Error selecting hotspot city:', e);
    }
  };

  const trendData = (dashData as any).trendMulti[trendPeriod] as Array<{ date: string; aqi: number; pm25: number; no2: number }>;
  const weather = (dashData as any).weather;
  const pm25 = (dashData as any).pm25;
  const gases = (dashData as any).gases as Array<{ name: string; value: number; unit: string; limit: number; color: string; trend: number }>;
  const aqiScale = (dashData as any).aqiScale as Array<{ label: string; range: string; color: string }>;

  const realGases = activeLoc ? [
    { name: 'PM10', value: activeLoc.pm10, unit: 'µg/m³', limit: 100, color: '#F59E0B', trend: 1 },
    { name: 'NO2', value: activeLoc.no2, unit: 'µg/m³', limit: 80, color: '#3B82F6', trend: 2 },
    { name: 'SO2', value: activeLoc.so2, unit: 'µg/m³', limit: 80, color: '#10B981', trend: -1 },
    { name: 'CO', value: activeLoc.co, unit: 'mg/m³', limit: 2, color: '#8B5CF6', trend: 0 },
    { name: 'O3', value: activeLoc.o3, unit: 'µg/m³', limit: 100, color: '#EC4899', trend: 1 },
    { name: 'NH3', value: activeLoc.nh3, unit: 'µg/m³', limit: 400, color: '#06B6D4', trend: -1 },
  ] : gases;

  const realWeather = activeLoc ? [
    { icon: Droplets, label: 'Humidity', value: activeLoc.humidity, unit: '%', color: '#3B82F6', sub: activeLoc.humidity > 70 ? 'High moisture level' : 'Optimal humidity' },
    { icon: Wind, label: 'Wind Speed', value: activeLoc.windSpeed, unit: 'km/h', color: '#6366F1', sub: `Direction: ${activeLoc.windDirection}` },
    { icon: Thermometer, label: 'Temperature', value: activeLoc.temperature, unit: '°C', color: '#F97316', sub: `Feels like ${activeLoc.feelsLike}°C` },
    { icon: Eye, label: 'Visibility', value: activeLoc.visibility || 3.2, unit: 'km', color: '#8B5CF6', sub: 'Atmospheric visibility' },
  ] : [
    { icon: Droplets, label: 'Humidity', value: weather.humidity, unit: weather.humidityUnit, color: '#3B82F6', sub: 'High moisture' },
    { icon: Wind, label: 'Wind Speed', value: weather.windSpeed, unit: weather.windSpeedUnit, color: '#6366F1', sub: `Direction: ${weather.windDirection}` },
    { icon: Thermometer, label: 'Temperature', value: weather.temperature, unit: weather.temperatureUnit, color: '#F97316', sub: `Feels like ${weather.feelsLike}°C` },
    { icon: Eye, label: 'Visibility', value: 2.1, unit: 'km', color: '#8B5CF6', sub: 'Hazy conditions' },
  ];

  const currentPm25Val = activeLoc ? activeLoc.pm25 : pm25.value;
  const currentPm25Cat = aqiCategory(currentPm25Val);

  const officialCpcbVal = activeLoc?.cpcb_official_aqi != null
    ? Math.round(activeLoc.cpcb_official_aqi)
    : (activeLoc ? calculateCpcbAqi(activeLoc.pm25, activeLoc.pm10, activeLoc.no2, activeLoc.so2, activeLoc.co, activeLoc.o3, activeLoc.nh3) : 0);
  const officialCpcbCat = aqiCategory(officialCpcbVal);

  return (
    <div className="space-y-5">
      {/* Current AQI Banner — User GPS Location + Side-by-Side CPCB vs Model Comparison (TOP) */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden rounded-[20px] border border-border bg-card card-shadow"
      >
        {geoLoading ? (
          <div className="flex items-center justify-center gap-3 p-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <div className="text-sm font-600">Detecting your current GPS location & fetching live CPCB & Model AQI...</div>
          </div>
        ) : activeLoc ? (
          <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
            {/* Left — Selected / Detected Location Details */}
            <div className="flex flex-col gap-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-600 text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate text-foreground font-700 text-sm">{activeLoc.name}</span>
                <span className="text-muted-foreground">({activeLoc.displayName.split(',').slice(1, 3).join(',').trim()})</span>
                
                {activeLoc.isUserLocation ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[9px] font-700 text-emerald-600 uppercase tracking-wide">
                    <Navigation className="h-3 w-3 fill-emerald-600/20" /> Your Current GPS Location
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[9px] font-700 text-primary uppercase tracking-wide">
                    🔍 Searched Location
                  </span>
                )}

                {!activeLoc.isUserLocation && userLoc && (
                  <button
                    onClick={() => setActiveLoc(userLoc)}
                    className="ml-auto flex items-center gap-1 text-[10px] font-600 text-primary hover:underline"
                    title="Switch back to your live GPS position"
                  >
                    <Navigation className="h-3 w-3" /> Back to My Location ({userLoc.name})
                  </button>
                )}
              </div>

              {/* Side-by-side AQI Badges: Official Indian CPCB vs IQAir US EPA vs Model */}
              <div className="flex flex-wrap items-center gap-4">
                {/* 1. Official Indian CPCB NAQI Badge */}
                <div
                  className="flex items-center gap-3 rounded-2xl p-3 text-white shadow-md border border-white/10"
                  style={{ backgroundColor: officialCpcbCat.color }}
                >
                  <div className="text-center">
                    <div className="text-3xl font-800 leading-none">
                      <CountUp end={officialCpcbVal} duration={1.2} />
                    </div>
                    <div className="mt-1 text-[8px] font-bold tracking-wider uppercase opacity-90">Indian CPCB NAQI</div>
                  </div>
                  <div className="border-l border-white/20 pl-3">
                    <div className="text-xs font-700">{activeLoc.cpcb_official_category || officialCpcbCat.label}</div>
                    <div className="text-[9px] opacity-80 truncate max-w-[140px]">
                      {activeLoc.cpcb_official_dominant_pollutant ? `Dominant: ${activeLoc.cpcb_official_dominant_pollutant}` : 'CPCB Formula'}
                    </div>
                  </div>
                </div>

                {/* 2. IQAir Groq Search Badge */}
                {activeLoc.is_groq_aqi && (activeLoc.groq_aqi != null || activeLoc.aqi != null) && (
                  <div
                    className="flex items-center gap-3 rounded-2xl p-3 text-white shadow-md border border-white/10"
                    style={{ backgroundColor: activeLoc.categoryColor }}
                  >
                    <div className="text-center">
                      <div className="text-3xl font-800 leading-none">
                        <CountUp end={activeLoc.groq_aqi || activeLoc.aqi} duration={1.2} />
                      </div>
                      <div className="mt-1 text-[8px] font-bold tracking-wider uppercase opacity-90">IQAir US EPA</div>
                    </div>
                    <div className="border-l border-white/20 pl-3">
                      <div className="text-xs font-700">{activeLoc.category} (iqair.com)</div>
                      <div className="text-[9px] opacity-80">Groq Search (US EPA)</div>
                    </div>
                  </div>
                )}

                {/* 3. AI Model Predicted Badge */}
                <div
                  className="flex items-center gap-3 rounded-2xl p-3 text-white shadow-md border border-white/10"
                  style={{ backgroundColor: activeLoc.categoryColor }}
                >
                  <div className="text-center">
                    <div className="text-3xl font-800 leading-none">
                      <CountUp end={activeLoc.adjusted_aqi || activeLoc.aqi} duration={1.2} />
                    </div>
                    <div className="mt-1 text-[8px] font-bold tracking-wider uppercase opacity-90">AI Model</div>
                  </div>
                  <div className="border-l border-white/20 pl-3">
                    <div className="text-xs font-700">{activeLoc.category} (Predicted)</div>
                    <div className="text-[9px] opacity-80">Enhanced CNN-BiLSTM</div>
                  </div>
                </div>

                {/* 4. CPCB Ground Station Badge (if available and toggle enabled) */}
                {showCpcb && activeLoc.has_cpcb_station && activeLoc.cpcb_aqi != null && (
                  <div
                    className="flex items-center gap-3 rounded-2xl p-3 text-white shadow-md border border-white/10"
                    style={{ backgroundColor: activeLoc.cpcb_categoryColor || activeLoc.categoryColor }}
                  >
                    <div className="text-center">
                      <div className="text-3xl font-800 leading-none">
                        <CountUp end={activeLoc.cpcb_aqi} duration={1.2} />
                      </div>
                      <div className="mt-1 text-[8px] font-bold tracking-wider uppercase opacity-90">CPCB Monitor</div>
                    </div>
                    <div className="border-l border-white/20 pl-3">
                      <div className="text-xs font-700">{activeLoc.cpcb_category || activeLoc.category}</div>
                      <div className="text-[9px] opacity-80 truncate max-w-[130px]">{activeLoc.cpcb_station_name}</div>
                    </div>
                  </div>
                )}

                {/* Dedicated CPCB toggle switch */}
                <CpcbToggleSwitch variant="default" />
              </div>

              <div className="text-[11px] text-muted-foreground">
                Primary pollutant: <span className="font-600 text-foreground">{activeLoc.cpcb_official_dominant_pollutant || activeLoc.dominantPollutant || 'PM2.5'}</span> · Dominant source: <span className="font-600 text-foreground">{activeLoc.primarySource || 'Vehicular + Industrial'}</span>
              </div>
            </div>

            {/* Right — Interactive AQI Category Scale & Advisory */}
            <div className="flex-1 lg:max-w-xl">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-700 uppercase tracking-wide text-muted-foreground">CPCB AQI Category Scale</span>
                <span className="text-[10px] font-600" style={{ color: activeLoc.categoryColor }}>{activeLoc.category} Level</span>
              </div>
              <div className="flex overflow-hidden rounded-xl">
                {aqiScale.map((s) => {
                  const active = s.label === (showCpcb && activeLoc.cpcb_category ? activeLoc.cpcb_category : activeLoc.category);
                  return (
                    <div
                      key={s.label}
                      className={cn(
                        'flex-1 px-2 py-2 text-center transition-all',
                        active ? 'ring-2 ring-offset-1 ring-offset-card ring-foreground/40 font-bold scale-[1.02]' : 'opacity-75'
                      )}
                      style={{ backgroundColor: s.color }}
                    >
                      <div className={cn('text-[9px] font-700 leading-tight', s.label === 'Severe' || s.label === 'Very Poor' ? 'text-white' : 'text-black/70')}>
                        {s.label}
                      </div>
                      <div className={cn('text-[8px] leading-tight', s.label === 'Severe' || s.label === 'Very Poor' ? 'text-white/80' : 'text-black/50')}>
                        {s.range}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground rounded-xl border border-border bg-muted/20 p-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: activeLoc.categoryColor }} />
                <div className="leading-snug">
                  <span className="font-700 text-foreground">Health Advisory: </span>
                  {activeLoc.healthAdvisory}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </motion.div>

      {/* Location Search with Map */}
      <LocationSearch onSelectLocation={setActiveLoc} initialLocation={activeLoc} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        <KpiCard
          label={showCpcb && activeLoc?.cpcb_aqi != null ? "CPCB Station AQI" : "Current Location AQI (AI Model)"}
          value={activeLoc ? (showCpcb && activeLoc.cpcb_aqi != null ? activeLoc.cpcb_aqi : activeLoc.aqi) : dashData.kpis[0].value}
          category={activeLoc ? (showCpcb && activeLoc.cpcb_category ? activeLoc.cpcb_category : activeLoc.category) : dashData.kpis[0].category}
          categoryColor={activeLoc ? (showCpcb && activeLoc.cpcb_categoryColor ? activeLoc.cpcb_categoryColor : activeLoc.categoryColor) : dashData.kpis[0].categoryColor}
          trend={dashData.kpis[0].trend}
          trendDirection="up"
          icon={Wind}
          iconColor="#22C55E"
          delay={0}
        />
        <KpiCard
          label="Active HCHO Hotspots"
          value={dashData.kpis[2].value}
          trend={dashData.kpis[2].trend}
          trendDirection="up"
          icon={Activity}
          iconColor="#EF4444"
          delay={0.05}
        />
        <KpiCard
          label="Active Fire Points"
          value={dashData.kpis[3].value}
          unit="MODIS / VIIRS"
          trend={dashData.kpis[3].trend}
          trendDirection="down"
          icon={Flame}
          iconColor="#FF7A00"
          delay={0.1}
        />
        <KpiCard
          label="Model Performance"
          value={dashData.kpis[4].value}
          decimals={2}
          suffix=" R² Accuracy"
          trend={dashData.kpis[4].trend}
          trendDirection="up"
          icon={Target}
          iconColor="#6366F1"
          delay={0.15}
        />
      </div>

      {/* Map + Hotspots Grid */}
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Left Map Panel */}
        <SectionCard
          title="Pan-India Real-Time AQI Map"
          subtitle="Click markers or search any location across India"
          action={
            <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
              {(['AQI Heatmap', 'HCHO Density', 'Fire Points'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setMapTab(t)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-[11px] font-600 transition-all',
                    mapTab === t ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          }
          delay={0.2}
          bodyClassName="p-0"
        >
          <Suspense fallback={<div className="flex h-[380px] items-center justify-center text-xs text-muted-foreground">Loading interactive map…</div>}>
            <IndiaMap
              hotspots={dashData.hotspots as any}
              cities={sortedHotspotCities.map((c) => ({
                city: c.city,
                state: c.state,
                lat: c.lat,
                lng: c.lng,
                aqi: c.aqi,
                cpcb_aqi: c.cpcb_aqi,
              }))}
              showCpcb={showCpcb}
              onSelectCity={handleSelectHotspot}
              showHeatmap={mapTab === 'AQI Heatmap'}
              showFires={mapTab === 'Fire Points'}
              height="380px"
            />
          </Suspense>
          <div className="flex items-center justify-between border-t border-border px-5 py-2.5">
            <span className="text-[11px] text-muted-foreground">Last Updated: Just now (Live Open-Meteo & CPCB feed)</span>
            <button className="flex items-center gap-1.5 text-[11px] text-primary hover:underline">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </SectionCard>

        {/* Right panel — Top 5 Pollution Hotspots */}
        <div className="flex flex-col gap-5">
          <SectionCard
            title="Top 5 Pollution Hotspots Today"
            delay={0.25}
            action={
              <div className="flex items-center gap-2">
                <CpcbToggleSwitch variant="compact" />
                <button className="text-[11px] font-600 text-primary hover:underline">View All</button>
              </div>
            }
          >
            <div className="space-y-1">
              <div className={cn(
                "mb-2 grid text-[10px] font-700 uppercase tracking-wide text-muted-foreground",
                showCpcb ? "grid-cols-[1fr_75px_75px]" : "grid-cols-[1fr_90px]"
              )}>
                <span>Region</span>
                {showCpcb && <span className="text-center">CPCB AQI</span>}
                <span className="text-center">{showCpcb ? "Model AQI" : "Predicted AQI"}</span>
              </div>
              {(sortedHotspotCities.length > 0 ? sortedHotspotCities : dashData.topCities).slice(0, 5).map((c: any, i: number) => {
                const cpcbCat = c.cpcb_aqi ? aqiCategory(c.cpcb_aqi) : null;
                const modelCat = aqiCategory(c.aqi);
                return (
                  <motion.div
                    key={c.city}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    onClick={() => handleSelectHotspot(c)}
                    className={cn(
                      "grid items-center rounded-xl px-2 py-2.5 hover:bg-muted/60 cursor-pointer transition-all active:scale-[0.99]",
                      showCpcb ? "grid-cols-[1fr_75px_75px]" : "grid-cols-[1fr_90px]"
                    )}
                    title={`Click to view live parameters and predicted AQI for ${c.city}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <div className="truncate">
                        <div className="text-xs font-600 truncate">{c.city}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{c.state}</div>
                      </div>
                    </div>
                    {showCpcb && (
                      <div className="text-center">
                        {c.cpcb_aqi ? (
                          <span className="rounded-lg px-2 py-0.5 text-xs font-700 inline-block" style={{ backgroundColor: `${cpcbCat?.color}20`, color: cpcbCat?.color }}>
                            {c.cpcb_aqi}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-500">—</span>
                        )}
                      </div>
                    )}
                    <div className="text-center">
                      <span className="rounded-lg px-2 py-0.5 text-xs font-700 inline-block" style={{ backgroundColor: `${modelCat.color}20`, color: modelCat.color }}>
                        {c.aqi}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </SectionCard>

          {/* AQI Trend Chart */}
          <SectionCard title={`${activeLoc?.name || 'National'} AQI Trend (7 Days)`} delay={0.3}>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={activeLoc?.trend7d || dashData.trend} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                <RTooltip contentStyle={{ borderRadius: 12, fontSize: 11, border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="aqi" stroke="#123A8F" strokeWidth={2} dot={{ r: 3, fill: '#123A8F' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>
      </div>

      {/* Weather Conditions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {realWeather.map((w, i) => (
          <motion.div
            key={w.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="flex items-center gap-3 rounded-[18px] border border-border bg-card p-4 card-shadow"
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${w.color}15` }}>
              <w.icon className="h-5 w-5" style={{ color: w.color }} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{w.label}</div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-700">{w.value}</span>
                <span className="text-[11px] text-muted-foreground">{w.unit}</span>
              </div>
              <div className="truncate text-[10px] text-muted-foreground">{w.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* PM2.5 + Concentration Gases */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        {/* PM2.5 */}
        <SectionCard title="PM 2.5" subtitle="Particulate Matter ≤ 2.5µm" icon={<Activity className="h-4 w-4" />} delay={0.1}>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <div className="relative grid h-28 w-28 place-items-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                  <circle
                    cx="50" cy="50" r="42" fill="none" stroke={currentPm25Cat.color} strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${Math.min((currentPm25Val / 200) * 264, 264)} 264`}
                  />
                </svg>
                <div className="text-center">
                  <div className="text-2xl font-700" style={{ color: currentPm25Cat.color }}>{currentPm25Val}</div>
                  <div className="text-[9px] text-muted-foreground">µg/m³</div>
                </div>
              </div>
              <span className="mt-1 rounded-full px-2.5 py-0.5 text-[10px] font-700 text-white" style={{ backgroundColor: currentPm25Cat.color }}>
                {currentPm25Cat.label}
              </span>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">CPCB Daily Limit</span>
                <span className="font-700">60 µg/m³</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">WHO Guideline</span>
                <span className="font-700">15 µg/m³</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Exceedance</span>
                <span className="font-700 text-destructive">{(currentPm25Val / 60 * 100 - 100).toFixed(0)}% above limit</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(currentPm25Val / 200 * 100, 100)}%`, backgroundColor: currentPm25Cat.color }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground">
                PM2.5 is {(currentPm25Val / 15).toFixed(1)}× above WHO daily guideline. Primary source: combustion & dust.
                {activeLoc?.is_groq_aqi && activeLoc.groq_pm25 != null && (
                  <span className="block mt-1 font-600 text-primary">
                    IQAir PM2.5: {activeLoc.groq_pm25} µg/m³ · Model PM2.5: {currentPm25Val} µg/m³
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* 24h mini trend */}
          <div className="mt-4 h-20">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeLoc?.trend24h || pm25.trend24h}>
                <defs>
                  <linearGradient id="pm25grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={currentPm25Cat.color} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={currentPm25Cat.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 9 }} stroke="currentColor" className="text-muted-foreground" axisLine={false} tickLine={false} />
                <RTooltip contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
                <Area type="monotone" dataKey="pm25" stroke={currentPm25Cat.color} strokeWidth={2} fill="url(#pm25grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Concentration Gases */}
        <SectionCard title="Concentration Gases" subtitle="Real-time pollutant gas levels" icon={<Cloud className="h-4 w-4" />} delay={0.15}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {realGases.map((g, i) => {
              const pct = Math.min((g.value / g.limit) * 100, 100);
              const overLimit = g.value >= g.limit * 0.9;
              return (
                <motion.div
                  key={g.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 * i }}
                  className="rounded-xl border border-border bg-muted/30 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-700">{g.name}</span>
                    {g.trend > 0 ? (
                      <TrendingUp className="h-3 w-3 text-destructive" />
                    ) : g.trend < 0 ? (
                      <TrendingDown className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Activity className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-lg font-700" style={{ color: overLimit ? g.color : 'inherit' }}>{g.value}</span>
                    <span className="text-[9px] text-muted-foreground">{g.unit}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: g.color }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[8px] text-muted-foreground">
                    <span>Limit: {g.limit}</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-muted/20 p-2.5 text-[10px] text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            Live pollutant readings provided by Open-Meteo & CPCB monitoring network.
          </div>
        </SectionCard>
      </div>

      {/* Multi-period Trend Graph */}
      <SectionCard
        title="AQI Trends"
        subtitle="Historical comparison across time periods"
        icon={<TrendingUp className="h-4 w-4" />}
        delay={0.1}
        action={
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
            {([
              { key: '7days', label: '7 Days' },
              { key: '24days', label: '24 Days' },
              { key: '1year', label: '1 Year' },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setTrendPeriod(t.key)}
                className={cn(
                  'rounded-lg px-3 py-1 text-[11px] font-600 transition-all',
                  trendPeriod === t.key
                    ? 'bg-[#123A8F] text-white'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="aqiTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#123A8F" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#123A8F" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="pm25TrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted/20" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" axisLine={false} tickLine={false} />
              <RTooltip
                contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                labelStyle={{ fontWeight: 700, fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="aqi" name="AQI" stroke="#123A8F" strokeWidth={2.5} fill="url(#aqiTrendGrad)" />
              <Area type="monotone" dataKey="pm25" name="PM 2.5" stroke="#EF4444" strokeWidth={2} fill="url(#pm25TrendGrad)" />
              <Line type="monotone" dataKey="no2" name="NO₂" stroke="#F97316" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {[
            { label: 'Avg AQI', value: (trendData.reduce((a, b) => a + b.aqi, 0) / trendData.length).toFixed(0), color: '#123A8F' },
            { label: 'Peak AQI', value: Math.max(...trendData.map((d) => d.aqi)), color: '#EF4444' },
            { label: 'Min AQI', value: Math.min(...trendData.map((d) => d.aqi)), color: '#22C55E' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-muted/40 p-2.5 text-center">
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
              <div className="text-lg font-700" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
