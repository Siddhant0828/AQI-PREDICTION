import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Hotspot } from '@/types';
import { aqiCategory } from './AqiBadge';

interface IndiaMapProps {
  hotspots?: Hotspot[];
  cities?: { city: string; state: string; lat: number; lng: number; aqi: number; cpcb_aqi?: number | null }[];
  showFires?: boolean;
  showHeatmap?: boolean;
  showCpcb?: boolean;
  onSelectCity?: (city: { city: string; state: string; lat: number; lng: number }) => void;
  opacity?: number;
  height?: string;
  center?: [number, number];
  zoom?: number;
  legendItems?: { label: string; color: string }[];
}

function FitBounds() {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds([6.5, 67.0], [37.0, 97.5]);
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [map]);
  return null;
}

const cityCoords: Record<string, [number, number]> = {
  Delhi: [28.61, 77.21],
  Lucknow: [26.85, 80.95],
  Patna: [25.59, 85.14],
  Kolkata: [22.57, 88.36],
  Jaipur: [26.91, 75.79],
  Ahmedabad: [23.02, 72.57],
  Hyderabad: [17.39, 78.49],
  Mumbai: [19.08, 72.88],
  Chennai: [13.08, 80.27],
  Bengaluru: [12.97, 77.59],
  Bhopal: [23.26, 77.41],
  Chandigarh: [30.73, 76.78],
};

export function IndiaMap({
  hotspots = [],
  cities = [],
  showFires = true,
  showHeatmap = true,
  showCpcb = false,
  onSelectCity,
  opacity = 0.7,
  height = '520px',
  center = [22.5, 80],
  zoom = 5,
  legendItems,
}: IndiaMapProps) {
  const cityMarkers = useMemo(
    () =>
      cities.map((c) => {
        const displayAqi = showCpcb && c.cpcb_aqi != null ? c.cpcb_aqi : c.aqi;
        return {
          ...c,
          displayAqi,
          lat: c.lat ?? cityCoords[c.city]?.[0],
          lng: c.lng ?? cityCoords[c.city]?.[1],
        };
      }),
    [cities, showCpcb]
  );

  return (
    <div className="relative w-full overflow-hidden rounded-[18px]" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={false}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <ZoomControl position="bottomright" />
        <FitBounds />

        {showHeatmap &&
          hotspots.map((h) => {
            const color = h.intensity === 'high' ? '#EF4444' : h.intensity === 'medium' ? '#F97316' : '#F59E0B';
            return (
              <CircleMarker
                key={h.id}
                center={[h.lat, h.lng]}
                radius={14 + h.hcho * 2.4}
                pathOptions={{ color, fillColor: color, fillOpacity: opacity * 0.5, weight: 1 }}
              >
                <Tooltip>
                  <div className="text-xs">
                    <div className="font-bold">{h.location}</div>
                    <div>HCHO: {h.hcho} × 10¹⁶ mol/cm²</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}

        {cityMarkers.map((c) => {
          const cat = aqiCategory(c.displayAqi);
          return (
            <CircleMarker
              key={c.city}
              center={[c.lat, c.lng]}
              radius={8}
              pathOptions={{ color: cat.color, fillColor: cat.color, fillOpacity: 0.85, weight: 2 }}
            >
              <Popup>
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-sm">{c.city}</div>
                  <div className="text-[10px] text-gray-500">{c.state}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold px-1.5 py-0.5 rounded text-white text-[11px]" style={{ backgroundColor: cat.color }}>
                      {c.displayAqi}
                    </span>
                    <span className="font-semibold" style={{ color: cat.color }}>{cat.label}</span>
                  </div>
                  <div className="pt-1 border-t border-gray-200 dark:border-gray-700 text-[10px] space-y-0.5">
                    <div className="text-gray-600 dark:text-gray-300">
                      Model Predicted: <strong className="text-foreground">{c.aqi}</strong>
                    </div>
                    {showCpcb && c.cpcb_aqi != null && (
                      <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        CPCB Station: {c.cpcb_aqi}
                      </div>
                    )}
                    {onSelectCity && (
                      <button
                        type="button"
                        onClick={() => onSelectCity({ city: c.city, state: c.state, lat: c.lat, lng: c.lng })}
                        className="mt-2 w-full rounded-lg bg-primary/10 py-1 text-[10px] font-700 text-primary hover:bg-primary/20 transition text-center"
                      >
                        Select & Load Live Parameters
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
              <Tooltip direction="top">
                <div className="text-xs font-bold">
                  {c.city}: {showCpcb && c.cpcb_aqi != null ? `CPCB ${c.cpcb_aqi} (Model ${c.aqi})` : `AQI ${c.aqi}`}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}

        {showFires &&
          hotspots.flatMap((h) =>
            Array.from({ length: Math.min(h.fires, 8) }, (_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              const r = 0.4 + (i % 3) * 0.2;
              return (
                <CircleMarker
                  key={`${h.id}-f${i}`}
                  center={[h.lat + Math.cos(angle) * r, h.lng + Math.sin(angle) * r]}
                  radius={3}
                  pathOptions={{ color: '#FF7A00', fillColor: '#FF7A00', fillOpacity: 0.85, weight: 1 }}
                />
              );
            })
          )}
      </MapContainer>

      {(legendItems ?? [
        { label: 'Severe (301+)', color: '#7F1D1D' },
        { label: 'Very Unhealthy (201-300)', color: '#EF4444' },
        { label: 'Unhealthy (151-200)', color: '#F97316' },
        { label: 'Moderate (51-100)', color: '#84CC16' },
        { label: 'Good (0-50)', color: '#22C55E' },
      ]).length > 0 && (
        <div className="absolute bottom-3 left-3 z-[400] rounded-xl border border-white/10 bg-white/95 px-3 py-2 text-[10px] backdrop-blur dark:bg-card/90">
          <div className="mb-1.5 font-bold uppercase tracking-wide text-muted-foreground">AQI Legend</div>
          {(legendItems ?? [
            { label: 'Severe (301+)', color: '#7F1D1D' },
            { label: 'Very Unhealthy (201-300)', color: '#EF4444' },
            { label: 'Unhealthy (151-200)', color: '#F97316' },
            { label: 'Moderate (51-100)', color: '#84CC16' },
            { label: 'Good (0-50)', color: '#22C55E' },
          ]).map((l) => (
            <div key={l.label} className="flex items-center gap-2 py-0.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />
              <span className="text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
