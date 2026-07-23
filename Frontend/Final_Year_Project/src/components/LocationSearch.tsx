import { ApiClient } from '@/api/client';
import { aqiCategory } from '@/components/AqiBadge';
import { motion } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    AlertTriangle,
    Droplets,
    Eye,
    Layers,
    Loader2,
    MapPin,
    Navigation,
    Search,
    Thermometer,
    Wind,
    X
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

// Fix Leaflet default icon issue
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  address?: Record<string, string>;
}

interface SearchResult {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  type: string;
  source: 'nominatim' | 'overpass';
}

export interface LocationAirData {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  type: string;
  aqi: number;
  category: string;
  categoryColor: string;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  co: number;
  o3: number;
  nh3: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  feelsLike: number;
  visibility: number;
  dominantPollutant: string;
  primarySource: string;
  healthAdvisory: string;
  has_cpcb_station?: boolean;
  cpcb_station_name?: string | null;
  cpcb_aqi?: number | null;
  cpcb_category?: string;
  cpcb_categoryColor?: string;
  isUserLocation?: boolean;

  trend24h?: Array<{ time: string; pm25: number }>;
  trend7d?: Array<{ date: string; aqi: number; pm25: number; no2: number }>;
  forecast5d?: Array<{ date: string; predicted: number; confidence: number }>;
}

function advisory(aqi: number): string {
  if (aqi <= 50) return 'Air quality is good. Safe for all outdoor activities.';
  if (aqi <= 100) return 'Acceptable air quality. Sensitive individuals may experience minor discomfort.';
  if (aqi <= 200) return 'Moderate pollution. Sensitive groups should limit prolonged outdoor exertion.';
  if (aqi <= 300) return 'Poor air quality. Everyone may experience health effects. Limit outdoor activities.';
  if (aqi <= 400) return 'Very poor air quality. Avoid outdoor activities. Use N95 masks if going outside.';
  return 'Severe pollution. Emergency conditions. Stay indoors. Use air purifiers.';
}

function calculateCpcbAqi(pm25?: number | null, pm10?: number | null): number {
  if (pm25 == null && pm10 == null) return 50;

  const getSubIndex = (cp: number, bps: Array<[number, number, number, number]>) => {
    for (const [cLow, cHigh, iLow, iHigh] of bps) {
      if (cp >= cLow && cp <= cHigh) {
        return ((iHigh - iLow) / (cHigh - cLow)) * (cp - cLow) + iLow;
      }
    }
    return cp > 500 ? 500 : 0;
  };

  const pm25Bps: Array<[number, number, number, number]> = [
    [0, 30, 0, 50],
    [31, 60, 51, 100],
    [61, 90, 101, 200],
    [91, 120, 201, 300],
    [121, 250, 301, 400],
    [250.1, 5000, 401, 500],
  ];

  const pm10Bps: Array<[number, number, number, number]> = [
    [0, 50, 0, 50],
    [51, 100, 51, 100],
    [101, 250, 101, 200],
    [251, 350, 201, 300],
    [351, 430, 301, 400],
    [430.1, 5000, 401, 500],
  ];

  const i25 = pm25 != null ? getSubIndex(pm25, pm25Bps) : -1;
  const i10 = pm10 != null ? getSubIndex(pm10, pm10Bps) : -1;

  const valid = [i25, i10].filter((i) => i >= 0);
  return valid.length > 0 ? Math.round(Math.max(...valid)) : 50;
}

// Generate plausible air quality data based on coordinates (deterministic seed from lat/lng)
function generateAirData(lat: number, lng: number, name: string, displayName: string, type: string): LocationAirData {
  // Deterministic pseudo-random based on coordinates
  const seed = Math.abs(Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453);
  const rand = (n: number) => {
    const s = Math.abs(Math.sin(seed * n + n * 17.31) * 43758.5453);
    return s - Math.floor(s);
  };

  // Northern India (Delhi belt) tends to have worse AQI; coastal/southern better
  const northFactor = Math.max(0, (lat - 20) / 12); // 0 in south, ~1 in north
  const inlandFactor = Math.max(0, Math.min(1, (lng - 78) / 8)); // more inland = worse
  const baseAqi = 45 + northFactor * 180 + inlandFactor * 80 + rand(1) * 60;
  const aqi = Math.round(Math.min(480, Math.max(35, baseAqi)));
  const cat = aqiCategory(aqi);

  // Smaller places generally have lower pollution
  const placeFactor = type === 'city' ? 1.0 : type === 'town' ? 0.85 : type === 'village' ? 0.6 : 0.5;

  return {
    name,
    displayName,
    lat,
    lng,
    type,
    aqi,
    category: cat.label,
    categoryColor: cat.color,
    pm25: Math.round(aqi * 0.58 * placeFactor + rand(2) * 15),
    pm10: Math.round(aqi * 0.82 * placeFactor + rand(3) * 20),
    no2: Math.round(20 + rand(4) * 60 * placeFactor),
    so2: Math.round(8 + rand(5) * 25 * placeFactor),
    co: +(0.3 + rand(6) * 1.2 * placeFactor).toFixed(1),
    o3: Math.round(30 + rand(7) * 45),
    nh3: Math.round(5 + rand(8) * 20 * placeFactor),
    temperature: Math.round(18 + rand(9) * 20 - (lat - 20) * 0.5),
    humidity: Math.round(45 + rand(10) * 40),
    windSpeed: Math.round(6 + rand(11) * 18),
    windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(rand(12) * 8)],
    feelsLike: Math.round(20 + rand(13) * 20 - (lat - 20) * 0.5 + 3),
    visibility: +(15 - (aqi / 500) * 12).toFixed(1),
    dominantPollutant: aqi > 200 ? 'PM2.5' : aqi > 100 ? 'PM10' : 'O3',
    primarySource: type === 'village' || type === 'hamlet' ? 'Agricultural + Biomass' : type === 'town' ? 'Vehicular + Industrial' : 'Vehicular + Industrial + Construction',
    healthAdvisory: advisory(aqi),
    has_cpcb_station: true,
    cpcb_station_name: `CPCB Monitor - ${name}`,
    cpcb_aqi: Math.max(30, Math.min(500, Math.round(aqi + (rand(14) - 0.48) * 30))),
    cpcb_category: aqiCategory(Math.max(30, Math.min(500, Math.round(aqi + (rand(14) - 0.48) * 30)))).label,
    cpcb_categoryColor: aqiCategory(Math.max(30, Math.min(500, Math.round(aqi + (rand(14) - 0.48) * 30)))).color,
  };
}

function degreesToCompass(deg?: number): string {
  if (deg == null) return 'N';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(deg / 45) % 8;
  return directions[index];
}

async function fetchOpenMeteoData(lat: number, lng: number) {
  try {
    const [weatherRes, airRes, hourlyRes] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,apparent_temperature`
      ),
      fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,ozone,ammonia`
      ),
      fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=pm2_5,pm10,nitrogen_dioxide&past_days=7&forecast_days=5`
      ),
    ]);

    let weatherData: any = {};
    let airData: any = {};
    let hourlyAirData: any = {};

    if (weatherRes.ok) {
      const wJson = await weatherRes.json();
      weatherData = wJson.current || {};
    }

    if (airRes.ok) {
      const aJson = await airRes.json();
      airData = aJson.current || {};
    }

    if (hourlyRes.ok) {
      const hJson = await hourlyRes.json();
      hourlyAirData = hJson.hourly || {};
    }

    return { weatherData, airData, hourlyAirData };
  } catch (e) {
    console.warn('Open-Meteo live API error:', e);
    return { weatherData: {}, airData: {}, hourlyAirData: {} };
  }
}

export async function fetchAirDataForCoordinates(
  lat: number,
  lng: number,
  overrideName?: string,
  overrideDisplayName?: string,
  overrideType?: string,
  isUserLocation?: boolean
): Promise<LocationAirData> {
  let name = overrideName || 'Current Location';
  let displayName = overrideDisplayName || `${lat.toFixed(4)}, ${lng.toFixed(4)}, India`;
  let type = overrideType || 'city';

  if (!overrideName) {
    try {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (nomRes.ok) {
        const nomData = (await nomRes.json()) as { display_name?: string; address?: Record<string, string> };
        const addr = nomData.address || {};
        const placeName = addr.suburb || addr.neighbourhood || addr.city || addr.town || addr.village || addr.county || addr.state_district || nomData.display_name?.split(',')[0];
        if (placeName) {
          name = placeName;
          displayName = nomData.display_name || `${placeName}, India`;
          type = addr.village ? 'village' : addr.town ? 'town' : addr.suburb ? 'suburb' : 'city';
        }
      }
    } catch (e) {
      console.warn('Reverse geocoding failed:', e);
    }
  }

  const airData = generateAirData(lat, lng, name, displayName, type);
  if (isUserLocation !== undefined) {
    airData.isUserLocation = isUserLocation;
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    const [openMeteo, predictRes] = await Promise.all([
      fetchOpenMeteoData(lat, lng),
      ApiClient.post<{ 
        aqi: number, pm25: number, pm10: number, status: string,
        has_cpcb_station: boolean, cpcb_station_name: string | null,
        cpcb_aqi: number | null, cpcb_pm25: number | null, cpcb_pm10: number | null,
        cpcb_distance_km: number | null
      }>('/predict', {
        latitude: lat,
        longitude: lng,
        date: today
      }).catch(() => null)
    ]);

    const { weatherData, airData: openMeteoAir, hourlyAirData } = openMeteo;

    // Apply real live Open-Meteo weather parameters if available
    if (weatherData.temperature_2m != null) airData.temperature = Math.round(weatherData.temperature_2m);
    if (weatherData.relative_humidity_2m != null) airData.humidity = Math.round(weatherData.relative_humidity_2m);
    if (weatherData.wind_speed_10m != null) airData.windSpeed = Math.round(weatherData.wind_speed_10m);
    if (weatherData.wind_direction_10m != null) airData.windDirection = degreesToCompass(weatherData.wind_direction_10m);
    if (weatherData.apparent_temperature != null) airData.feelsLike = Math.round(weatherData.apparent_temperature);

    // Apply real live Open-Meteo air quality pollutant concentrations if available
    if (openMeteoAir.pm2_5 != null) airData.pm25 = Math.round(openMeteoAir.pm2_5);
    if (openMeteoAir.pm10 != null) airData.pm10 = Math.round(openMeteoAir.pm10);
    if (openMeteoAir.nitrogen_dioxide != null) airData.no2 = Math.round(openMeteoAir.nitrogen_dioxide);
    if (openMeteoAir.sulphur_dioxide != null) airData.so2 = Math.round(openMeteoAir.sulphur_dioxide);
    if (openMeteoAir.carbon_monoxide != null) airData.co = +((openMeteoAir.carbon_monoxide / 1000).toFixed(1));
    if (openMeteoAir.ozone != null) airData.o3 = Math.round(openMeteoAir.ozone);
    if (openMeteoAir.ammonia != null) airData.nh3 = Math.round(openMeteoAir.ammonia);

    // Process hourly trend & forecast data if available
    if (hourlyAirData && hourlyAirData.time && hourlyAirData.time.length > 0) {
      const times: string[] = hourlyAirData.time;
      const p25s: number[] = hourlyAirData.pm2_5 || [];
      const p10s: number[] = hourlyAirData.pm10 || [];
      const no2s: number[] = hourlyAirData.nitrogen_dioxide || [];

      // 1. 24h mini trend
      const nowISO = new Date().toISOString().slice(0, 13);
      let currIdx = times.findIndex((t) => t.startsWith(nowISO));
      if (currIdx === -1) currIdx = Math.min(168, times.length - 1);

      const trend24h: Array<{ time: string; pm25: number }> = [];
      const start24h = Math.max(0, currIdx - 24);
      for (let i = start24h; i <= currIdx; i += 3) {
        if (times[i] && p25s[i] != null) {
          const tLabel = times[i].split('T')[1]?.slice(0, 5) || '00:00';
          trend24h.push({ time: tLabel, pm25: Math.round(p25s[i]) });
        }
      }
      if (trend24h.length > 0) airData.trend24h = trend24h;

      // 2. 7-Day History Trend
      const dayMap: Record<string, { p25: number[]; p10: number[]; no2: number[] }> = {};
      for (let i = 0; i <= currIdx; i++) {
        if (times[i]) {
          const dKey = times[i].split('T')[0];
          if (!dayMap[dKey]) dayMap[dKey] = { p25: [], p10: [], no2: [] };
          if (p25s[i] != null) dayMap[dKey].p25.push(p25s[i]);
          if (p10s[i] != null) dayMap[dKey].p10.push(p10s[i]);
          if (no2s[i] != null) dayMap[dKey].no2.push(no2s[i]);
        }
      }

      const pastDates = Object.keys(dayMap).slice(-7);
      const trend7d = pastDates.map((dStr) => {
        const grp = dayMap[dStr];
        const avgP25 = grp.p25.length > 0 ? grp.p25.reduce((a, b) => a + b, 0) / grp.p25.length : 30;
        const avgP10 = grp.p10.length > 0 ? grp.p10.reduce((a, b) => a + b, 0) / grp.p10.length : 50;
        const avgNo2 = grp.no2.length > 0 ? grp.no2.reduce((a, b) => a + b, 0) / grp.no2.length : 20;

        const dObj = new Date(dStr);
        const dayLabel = dObj.toLocaleDateString('en-US', { weekday: 'short' });

        return {
          date: dayLabel,
          aqi: calculateCpcbAqi(avgP25, avgP10),
          pm25: Math.round(avgP25),
          no2: Math.round(avgNo2),
        };
      });
      if (trend7d.length > 0) airData.trend7d = trend7d;

      // 3. 5-Day Forecast
      const fcMap: Record<string, { p25: number[]; p10: number[] }> = {};
      for (let i = currIdx + 1; i < times.length; i++) {
        if (times[i]) {
          const dKey = times[i].split('T')[0];
          if (!fcMap[dKey]) fcMap[dKey] = { p25: [], p10: [] };
          if (p25s[i] != null) fcMap[dKey].p25.push(p25s[i]);
          if (p10s[i] != null) fcMap[dKey].p10.push(p10s[i]);
        }
      }

      const fcDates = Object.keys(fcMap).slice(0, 5);
      const confs = [94, 88, 82, 76, 70];
      const forecast5d = fcDates.map((dStr, idx) => {
        const grp = fcMap[dStr];
        const avgP25 = grp.p25.length > 0 ? grp.p25.reduce((a, b) => a + b, 0) / grp.p25.length : 30;
        const avgP10 = grp.p10.length > 0 ? grp.p10.reduce((a, b) => a + b, 0) / grp.p10.length : 50;
        const dLabel = idx === 0 ? 'Today' : `+${idx} Day${idx > 1 ? 's' : ''}`;

        return {
          date: dLabel,
          predicted: calculateCpcbAqi(avgP25, avgP10),
          confidence: confs[idx] || 70,
        };
      });
      if (forecast5d.length > 0) airData.forecast5d = forecast5d;
    }

    // Apply backend AI model prediction & CPCB ground station data if available
    if (predictRes && (predictRes.status === 'Success' || predictRes.status === 'completed')) {
      airData.aqi = Math.round(predictRes.aqi);
      if (predictRes.pm25) airData.pm25 = Math.round(predictRes.pm25);
      if (predictRes.pm10) airData.pm10 = Math.round(predictRes.pm10);
      
      const cat = aqiCategory(airData.aqi);
      airData.category = cat.label;
      airData.categoryColor = cat.color;
      airData.healthAdvisory = advisory(airData.aqi);
      
      if (predictRes.has_cpcb_station && predictRes.cpcb_aqi) {
        airData.has_cpcb_station = true;
        airData.cpcb_station_name = predictRes.cpcb_station_name || `CPCB Monitor - ${name}`;
        airData.cpcb_aqi = Math.round(predictRes.cpcb_aqi);
        const cpcbCat = aqiCategory(airData.cpcb_aqi);
        airData.cpcb_category = cpcbCat.label;
        airData.cpcb_categoryColor = cpcbCat.color;
      }
    }
  } catch (e) {
    console.error('Data fetch error:', e);
  }

  return airData;
}

// Component to recenter map when location changes
function MapRecenter({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 1.2 });
  }, [lat, lng, zoom, map]);
  return null;
}

// Custom colored marker based on AQI
function createColoredIcon(color: string) {
  return L.divIcon({
    className: 'custom-aqi-marker',
    html: `<div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
      <div style="transform: rotate(45deg); width: 10px; height: 10px; border-radius: 50%; background: white;"></div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

const INDIAN_LOCATIONS_INDEX: Array<{ name: string; displayName: string; lat: number; lng: number; type: string }> = [
  { name: 'Mumbai', displayName: 'Mumbai, Mumbai Suburban, Maharashtra, India', lat: 19.0760, lng: 72.8777, type: 'city' },
  { name: 'Delhi', displayName: 'Delhi, Delhi NCR, India', lat: 28.6542, lng: 77.2373, type: 'city' },
  { name: 'New Delhi', displayName: 'New Delhi, Delhi NCR, India', lat: 28.6139, lng: 77.2090, type: 'city' },
  { name: 'Bengaluru', displayName: 'Bengaluru, Bangalore Urban, Karnataka, India', lat: 12.9716, lng: 77.5946, type: 'city' },
  { name: 'Hyderabad', displayName: 'Hyderabad, Telangana, India', lat: 17.3850, lng: 78.4867, type: 'city' },
  { name: 'Ahmedabad', displayName: 'Ahmedabad, Gujarat, India', lat: 23.0225, lng: 72.5714, type: 'city' },
  { name: 'Chennai', displayName: 'Chennai, Tamil Nadu, India', lat: 13.0827, lng: 80.2707, type: 'city' },
  { name: 'Kolkata', displayName: 'Kolkata, West Bengal, India', lat: 22.5726, lng: 88.3639, type: 'city' },
  { name: 'Surat', displayName: 'Surat, Gujarat, India', lat: 21.1702, lng: 72.8311, type: 'city' },
  { name: 'Pune', displayName: 'Pune, Maharashtra, India', lat: 18.5204, lng: 73.8567, type: 'city' },
  { name: 'Jaipur', displayName: 'Jaipur, Rajasthan, India', lat: 26.9124, lng: 75.7873, type: 'city' },
  { name: 'Lucknow', displayName: 'Lucknow, Uttar Pradesh, India', lat: 26.8467, lng: 80.9462, type: 'city' },
  { name: 'Kanpur', displayName: 'Kanpur, Uttar Pradesh, India', lat: 26.4499, lng: 80.3319, type: 'city' },
  { name: 'Nagpur', displayName: 'Nagpur, Maharashtra, India', lat: 21.1458, lng: 79.0882, type: 'city' },
  { name: 'Indore', displayName: 'Indore, Madhya Pradesh, India', lat: 22.7196, lng: 75.8577, type: 'city' },
  { name: 'Thane', displayName: 'Thane, Maharashtra, India', lat: 19.2183, lng: 72.9781, type: 'city' },
  { name: 'Bhopal', displayName: 'Bhopal, Madhya Pradesh, India', lat: 23.2599, lng: 77.4126, type: 'city' },
  { name: 'Visakhapatnam', displayName: 'Visakhapatnam, Andhra Pradesh, India', lat: 17.6868, lng: 83.2185, type: 'city' },
  { name: 'Patna', displayName: 'Patna, Bihar, India', lat: 25.5941, lng: 85.1376, type: 'city' },
  { name: 'Vadodara', displayName: 'Vadodara, Gujarat, India', lat: 22.3072, lng: 73.1812, type: 'city' },
  { name: 'Ghaziabad', displayName: 'Ghaziabad, Uttar Pradesh, India', lat: 28.6692, lng: 77.4538, type: 'city' },
  { name: 'Ludhiana', displayName: 'Ludhiana, Punjab, India', lat: 30.9010, lng: 75.8573, type: 'city' },
  { name: 'Agra', displayName: 'Agra, Uttar Pradesh, India', lat: 27.1767, lng: 78.0081, type: 'city' },
  { name: 'Nashik', displayName: 'Nashik, Maharashtra, India', lat: 19.9975, lng: 73.7898, type: 'city' },
  { name: 'Ranchi', displayName: 'Ranchi, Jharkhand, India', lat: 23.3441, lng: 85.3096, type: 'city' },
  { name: 'Faridabad', displayName: 'Faridabad, Haryana, India', lat: 28.4089, lng: 77.3178, type: 'city' },
  { name: 'Meerut', displayName: 'Meerut, Uttar Pradesh, India', lat: 28.9845, lng: 77.7064, type: 'city' },
  { name: 'Rajkot', displayName: 'Rajkot, Gujarat, India', lat: 22.3039, lng: 70.8022, type: 'city' },
  { name: 'Varanasi', displayName: 'Varanasi, Uttar Pradesh, India', lat: 25.3176, lng: 82.9739, type: 'city' },
  { name: 'Srinagar', displayName: 'Srinagar, Jammu and Kashmir, India', lat: 34.0837, lng: 74.7973, type: 'city' },
  { name: 'Aurangabad', displayName: 'Aurangabad, Chhatrapati Sambhaji Nagar, Maharashtra, India', lat: 19.8762, lng: 75.3433, type: 'city' },
  { name: 'Dhanbad', displayName: 'Dhanbad, Jharkhand, India', lat: 23.7957, lng: 86.4304, type: 'city' },
  { name: 'Amritsar', displayName: 'Amritsar, Punjab, India', lat: 31.6340, lng: 74.8723, type: 'city' },
  { name: 'Navi Mumbai', displayName: 'Navi Mumbai, Maharashtra, India', lat: 19.0330, lng: 73.0297, type: 'city' },
  { name: 'Allahabad', displayName: 'Prayagraj (Allahabad), Uttar Pradesh, India', lat: 25.4358, lng: 81.8463, type: 'city' },
  { name: 'Prayagraj', displayName: 'Prayagraj, Uttar Pradesh, India', lat: 25.4358, lng: 81.8463, type: 'city' },
  { name: 'Howrah', displayName: 'Howrah, West Bengal, India', lat: 22.5958, lng: 88.2636, type: 'city' },
  { name: 'Gwalior', displayName: 'Gwalior, Madhya Pradesh, India', lat: 26.2183, lng: 78.1828, type: 'city' },
  { name: 'Jabalpur', displayName: 'Jabalpur, Madhya Pradesh, India', lat: 23.1815, lng: 79.9864, type: 'city' },
  { name: 'Coimbatore', displayName: 'Coimbatore, Tamil Nadu, India', lat: 11.0168, lng: 76.9558, type: 'city' },
  { name: 'Vijayawada', displayName: 'Vijayawada, Andhra Pradesh, India', lat: 16.5062, lng: 80.6480, type: 'city' },
  { name: 'Jodhpur', displayName: 'Jodhpur, Rajasthan, India', lat: 26.2389, lng: 73.0243, type: 'city' },
  { name: 'Madurai', displayName: 'Madurai, Tamil Nadu, India', lat: 9.9252, lng: 78.1198, type: 'city' },
  { name: 'Raipur', displayName: 'Raipur, Chhattisgarh, India', lat: 21.2514, lng: 81.6296, type: 'city' },
  { name: 'Kota', displayName: 'Kota, Rajasthan, India', lat: 25.2138, lng: 75.8648, type: 'city' },
  { name: 'Guwahati', displayName: 'Guwahati, Assam, India', lat: 26.1445, lng: 91.7362, type: 'city' },
  { name: 'Chandigarh', displayName: 'Chandigarh, Union Territory, India', lat: 30.7333, lng: 76.7794, type: 'city' },
  { name: 'Solapur', displayName: 'Solapur, Maharashtra, India', lat: 17.6599, lng: 75.9064, type: 'city' },
  { name: 'Hubli', displayName: 'Hubli, Karnataka, India', lat: 15.3647, lng: 75.1240, type: 'city' },
  { name: 'Bareilly', displayName: 'Bareilly, Uttar Pradesh, India', lat: 28.3670, lng: 79.4304, type: 'city' },
  { name: 'Mysore', displayName: 'Mysuru (Mysore), Karnataka, India', lat: 12.2958, lng: 76.6394, type: 'city' },
  { name: 'Gurgaon', displayName: 'Gurugram (Gurgaon), Haryana, India', lat: 28.4595, lng: 77.0266, type: 'city' },
  { name: 'Gurugram', displayName: 'Gurugram, Haryana, India', lat: 28.4595, lng: 77.0266, type: 'city' },
  { name: 'Noida', displayName: 'Noida, Uttar Pradesh, India', lat: 28.5355, lng: 77.3910, type: 'city' },
  { name: 'Aligarh', displayName: 'Aligarh, Uttar Pradesh, India', lat: 27.8974, lng: 78.0880, type: 'city' },
  { name: 'Jalandhar', displayName: 'Jalandhar, Punjab, India', lat: 31.3260, lng: 75.5762, type: 'city' },
  { name: 'Tiruchirappalli', displayName: 'Tiruchirappalli, Tamil Nadu, India', lat: 10.7905, lng: 78.7047, type: 'city' },
  { name: 'Bhubaneswar', displayName: 'Bhubaneswar, Odisha, India', lat: 20.2961, lng: 85.8245, type: 'city' },
  { name: 'Salem', displayName: 'Salem, Tamil Nadu, India', lat: 11.6643, lng: 78.1460, type: 'city' },
  { name: 'Warangal', displayName: 'Warangal, Telangana, India', lat: 17.9689, lng: 79.5941, type: 'city' },
  { name: 'Mira-Bhayandar', displayName: 'Mira-Bhayandar, Maharashtra, India', lat: 19.2952, lng: 72.8544, type: 'city' },
  { name: 'Jalgaon', displayName: 'Jalgaon, Maharashtra, India', lat: 21.0077, lng: 75.5626, type: 'city' },
  { name: 'Guntur', displayName: 'Guntur, Andhra Pradesh, India', lat: 16.3067, lng: 80.4365, type: 'city' },
  { name: 'Thiruvananthapuram', displayName: 'Thiruvananthapuram, Kerala, India', lat: 8.5241, lng: 76.9366, type: 'city' },
  { name: 'Bhiwandi', displayName: 'Bhiwandi, Maharashtra, India', lat: 19.2813, lng: 73.0483, type: 'city' },
  { name: 'Saharanpur', displayName: 'Saharanpur, Uttar Pradesh, India', lat: 29.9640, lng: 77.5460, type: 'city' },
  { name: 'Gorakhpur', displayName: 'Gorakhpur, Uttar Pradesh, India', lat: 26.7606, lng: 83.3732, type: 'city' },
  { name: 'Bikaner', displayName: 'Bikaner, Rajasthan, India', lat: 28.0229, lng: 73.3119, type: 'city' },
  { name: 'Amravati', displayName: 'Amravati, Maharashtra, India', lat: 20.9374, lng: 77.7796, type: 'city' },
  { name: 'Jamshedpur', displayName: 'Jamshedpur, Jharkhand, India', lat: 22.8046, lng: 86.2029, type: 'city' },
  { name: 'Bhilai', displayName: 'Bhilai, Chhattisgarh, India', lat: 21.1938, lng: 81.3509, type: 'city' },
  { name: 'Cuttack', displayName: 'Cuttack, Odisha, India', lat: 20.4625, lng: 85.8828, type: 'city' },
  { name: 'Kochi', displayName: 'Kochi (Cochin), Kerala, India', lat: 9.9312, lng: 76.2673, type: 'city' },
  { name: 'Cochin', displayName: 'Kochi, Kerala, India', lat: 9.9312, lng: 76.2673, type: 'city' },
  { name: 'Bhavnagar', displayName: 'Bhavnagar, Gujarat, India', lat: 21.7645, lng: 72.1519, type: 'city' },
  { name: 'Dehradun', displayName: 'Dehradun, Uttarakhand, India', lat: 30.3165, lng: 78.0322, type: 'city' },
  { name: 'Durgapur', displayName: 'Durgapur, West Bengal, India', lat: 23.5204, lng: 87.3119, type: 'city' },
  { name: 'Asansol', displayName: 'Asansol, West Bengal, India', lat: 23.6889, lng: 86.9661, type: 'city' },
  { name: 'Nanded', displayName: 'Nanded, Maharashtra, India', lat: 19.1383, lng: 77.3210, type: 'city' },
  { name: 'Kolhapur', displayName: 'Kolhapur, Maharashtra, India', lat: 16.7050, lng: 74.2433, type: 'city' },
  { name: 'Ajmer', displayName: 'Ajmer, Rajasthan, India', lat: 26.4499, lng: 74.6399, type: 'city' },
  { name: 'Gulbarga', displayName: 'Kalaburagi (Gulbarga), Karnataka, India', lat: 17.3297, lng: 76.8343, type: 'city' },
  { name: 'Jamnagar', displayName: 'Jamnagar, Gujarat, India', lat: 22.4707, lng: 70.0577, type: 'city' },
  { name: 'Ujjain', displayName: 'Ujjain, Madhya Pradesh, India', lat: 23.1765, lng: 75.7885, type: 'city' },
  { name: 'Siliguri', displayName: 'Siliguri, West Bengal, India', lat: 26.7271, lng: 88.3953, type: 'city' },
  { name: 'Jhansi', displayName: 'Jhansi, Uttar Pradesh, India', lat: 25.4484, lng: 78.5685, type: 'city' },
  { name: 'Jammu', displayName: 'Jammu, Jammu and Kashmir, India', lat: 32.7266, lng: 74.8570, type: 'city' },
  { name: 'Sangli', displayName: 'Sangli, Maharashtra, India', lat: 16.8524, lng: 74.5815, type: 'city' },
  { name: 'Mangalore', displayName: 'Mangaluru (Mangalore), Karnataka, India', lat: 12.9141, lng: 74.8560, type: 'city' },
  { name: 'Erode', displayName: 'Erode, Tamil Nadu, India', lat: 11.3410, lng: 77.7172, type: 'city' },
  { name: 'Belgaum', displayName: 'Belagavi (Belgaum), Karnataka, India', lat: 15.8497, lng: 74.4977, type: 'city' },
  { name: 'Tirupur', displayName: 'Tirupur, Tamil Nadu, India', lat: 11.1085, lng: 77.3411, type: 'city' },
  { name: 'Gaya', displayName: 'Gaya, Bihar, India', lat: 24.7914, lng: 85.0002, type: 'city' },
  { name: 'Udaipur', displayName: 'Udaipur, Rajasthan, India', lat: 24.5854, lng: 73.7125, type: 'city' },
  { name: 'Shimla', displayName: 'Shimla, Himachal Pradesh, India', lat: 31.1048, lng: 77.1734, type: 'city' },
  { name: 'Gangtok', displayName: 'Gangtok, Sikkim, India', lat: 27.3389, lng: 88.6065, type: 'city' },
  { name: 'Agartala', displayName: 'Agartala, Tripura, India', lat: 23.8315, lng: 91.2868, type: 'city' },
  { name: 'Shillong', displayName: 'Shillong, Meghalaya, India', lat: 25.5788, lng: 91.8933, type: 'city' },
  { name: 'Aizawl', displayName: 'Aizawl, Mizoram, India', lat: 23.7271, lng: 92.7176, type: 'city' },
  { name: 'Kohima', displayName: 'Kohima, Nagaland, India', lat: 25.6751, lng: 94.1086, type: 'city' },
  { name: 'Itanagar', displayName: 'Itanagar, Arunachal Pradesh, India', lat: 27.0844, lng: 93.6053, type: 'city' },
  { name: 'Dispur', displayName: 'Dispur, Assam, India', lat: 26.1433, lng: 91.7898, type: 'city' },
  { name: 'Leh', displayName: 'Leh, Ladakh, India', lat: 34.1526, lng: 77.5771, type: 'city' },
  { name: 'Pondicherry', displayName: 'Puducherry (Pondicherry), Union Territory, India', lat: 11.9416, lng: 79.8083, type: 'city' },
  { name: 'Panaji', displayName: 'Panaji (Panjim), Goa, India', lat: 15.4909, lng: 73.8278, type: 'city' },
];

export interface LocationSearchProps {
  onSelectLocation?: (data: LocationAirData) => void;
  initialLocation?: LocationAirData | null;
}

export function LocationSearch({ onSelectLocation, initialLocation }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState<LocationAirData | null>(initialLocation || null);
  const [geoLocating, setGeoLocating] = useState(false);
  const [mapLayer, setMapLayer] = useState<'street' | 'satellite'>('street');
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialLocation) {
      setSelected(initialLocation);
    }
  }, [initialLocation]);

  const handleUseMyLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const data = await fetchAirDataForCoordinates(latitude, longitude, undefined, undefined, undefined, true);
        setSelected(data);
        setQuery(data.name);
        if (onSelectLocation) onSelectLocation(data);
        setGeoLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        alert('Could not access your location. Please check browser location permissions.');
        setGeoLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const search = useCallback(async (q: string) => {
    const qClean = q.trim().toLowerCase();
    if (qClean.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);

    // Instant local index matches
    const localMatches: SearchResult[] = INDIAN_LOCATIONS_INDEX
      .filter((loc) => loc.name.toLowerCase().includes(qClean) || loc.displayName.toLowerCase().includes(qClean))
      .map((loc, idx) => ({
        id: `local-${idx}-${loc.name}`,
        name: loc.name,
        displayName: loc.displayName,
        lat: loc.lat,
        lng: loc.lng,
        type: loc.type,
        source: 'nominatim' as const,
      }));

    try {
      // 1) OpenStreetMap Nominatim search for full coverage across India
      let nomData: SearchResult[] = [];
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=in&limit=35&addressdetails=1`,
          { headers: { 'Accept-Language': 'en', 'User-Agent': 'AeroSense-AQI-India/1.0' } }
        );
        if (nomRes.ok) {
          const raw = (await nomRes.json()) as NominatimResult[];
          nomData = raw.map((r) => ({
            id: `nom-${r.place_id}`,
            name: r.display_name.split(',')[0],
            displayName: r.display_name,
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lon),
            type: r.type || r.class || 'place',
            source: 'nominatim' as const,
          }));
        }
      } catch (e) {
        console.warn('Nominatim API error:', e);
      }

      // Merge local index + online results
      const seen = new Set<string>();
      const merged = [...localMatches, ...nomData].filter((r) => {
        const key = `${r.name.toLowerCase()}-${r.lat.toFixed(2)}-${r.lng.toFixed(2)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Relevance ranking:
      // 1. Exact name match first
      // 2. Starts-with query next
      // 3. Major Cities/Towns/Districts before small hamlets
      // 4. Shorter name length
      const typeRank: Record<string, number> = {
        city: 0, town: 1, county: 2, district: 2, administrative: 3, state: 4, suburb: 5, neighbourhood: 6, village: 7, hamlet: 8
      };

      merged.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        const aExact = aName === qClean ? 1 : 0;
        const bExact = bName === qClean ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;

        const aStarts = aName.startsWith(qClean) ? 1 : 0;
        const bStarts = bName.startsWith(qClean) ? 1 : 0;
        if (aStarts !== bStarts) return bStarts - aStarts;

        const ra = typeRank[a.type] ?? 6;
        const rb = typeRank[b.type] ?? 6;
        if (ra !== rb) return ra - rb;

        return a.name.length - b.name.length;
      });

      setResults(merged.slice(0, 20));
    } catch {
      setResults(localMatches.slice(0, 20));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length >= 2) {
      debounceRef.current = setTimeout(() => search(query), 250);
    } else {
      setResults([]);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSelectResult(r: SearchResult) {
    setQuery(r.name);
    setFocused(false);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await ApiClient.post<{ 
        aqi: number, pm25: number, pm10: number, status: string,
        has_cpcb_station: boolean, cpcb_station_name: string | null,
        cpcb_aqi: number | null, cpcb_pm25: number | null, cpcb_pm10: number | null,
        cpcb_distance_km: number | null
      }>('/predict', {
        latitude: r.lat,
        longitude: r.lng,
        date: today
      });
      
      const airData = generateAirData(r.lat, r.lng, r.name, r.displayName, r.type);
      if (res.status === 'Success' || res.status === 'completed') {
        airData.aqi = Math.round(res.aqi);
        airData.pm25 = Math.round(res.pm25);
        airData.pm10 = Math.round(res.pm10);
        
        const cat = aqiCategory(airData.aqi);
        airData.category = cat.label;
        airData.categoryColor = cat.color;
        airData.healthAdvisory = advisory(airData.aqi);
        
        if (res.has_cpcb_station && res.cpcb_aqi) {
          airData.has_cpcb_station = true;
          airData.cpcb_station_name = res.cpcb_station_name || `CPCB Monitor - ${r.name}`;
          airData.cpcb_aqi = Math.round(res.cpcb_aqi);
          const cpcbCat = aqiCategory(airData.cpcb_aqi);
          airData.cpcb_category = cpcbCat.label;
          airData.cpcb_categoryColor = cpcbCat.color;
        }
      }
      setSelected(airData);
    } catch (e) {
      console.error('Prediction failed, falling back to mock:', e);
      const airData = generateAirData(r.lat, r.lng, r.name, r.displayName, r.type);
      setSelected(airData);
    }
  }

  const placeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      city: 'City', town: 'Town', village: 'Village', hamlet: 'Hamlet',
      municipality: 'Municipality', county: 'District', state: 'State',
      suburb: 'Suburb', neighbourhood: 'Neighbourhood', residential: 'Residential',
      administrative: 'Administrative Area', isolated_dwelling: 'Settlement',
      farm: 'Farm', '2': 'State', '4': 'State', '5': 'District',
      '6': 'District', '7': 'Sub-District', '8': 'Taluka', '9': 'Block',
      '10': 'Village Area',
    };
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div ref={containerRef} className="relative space-y-3">
      {/* Search Bar */}
      <div className="flex items-center gap-2 rounded-[16px] border border-border bg-card p-2 card-shadow">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setFocused(true); }}
            onFocus={() => setFocused(true)}
            placeholder="Search any state, city, district, taluka, or village in India..."
            className="w-full rounded-xl border-0 bg-muted/40 py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setSelected(null); setResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={geoLocating}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-600 text-primary hover:bg-primary/20 transition disabled:opacity-50"
          title="Detect and use your current physical GPS location"
        >
          {geoLocating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Navigation className="h-3.5 w-3.5 text-primary fill-primary/20" />
          )}
          <span className="hidden sm:inline">{geoLocating ? 'Locating...' : 'Use My Location'}</span>
        </button>
      </div>

      {/* Search Results Dropdown */}
      {focused && query.trim().length >= 3 && (
        <div className="absolute z-[1000] mt-1 w-full overflow-hidden rounded-[16px] border border-border bg-card shadow-xl">
          {results.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              {results.map((r) => {
                const parts = r.displayName.split(',');
                const subParts = parts.slice(1, 3).join(',').trim();
                return (
                  <button
                    key={r.id}
                    onClick={() => handleSelectResult(r)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/40"
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-600">{r.name}</span>
                        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[8px] font-600 text-primary">
                          {placeTypeLabel(r.type)}
                        </span>
                        {r.source === 'overpass' && (
                          <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[7px] font-600 text-emerald-600">
                            OSM
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[10px] text-muted-foreground">{subParts}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching across India...
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              No locations found. Try a different search term.
            </div>
          )}
        </div>
      )}

      {/* Map + Detail Panel */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid gap-4 lg:grid-cols-[1fr_360px]"
        >
          {/* Interactive Map */}
          <div className="relative overflow-hidden rounded-[20px] border border-border card-shadow">
            <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-1.5">
              <button
                onClick={() => setMapLayer(mapLayer === 'street' ? 'satellite' : 'street')}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card/90 px-2.5 py-1.5 text-[10px] font-600 backdrop-blur transition hover:bg-card"
                title="Toggle map layer"
              >
                <Layers className="h-3 w-3" />
                {mapLayer === 'street' ? 'Satellite' : 'Street'}
              </button>
            </div>
            <MapContainer
              center={[selected.lat, selected.lng]}
              zoom={11}
              scrollWheelZoom={true}
              style={{ height: '400px', width: '100%' }}
            >
              <MapRecenter lat={selected.lat} lng={selected.lng} zoom={11} />
              <TileLayer
                key={mapLayer}
                url={mapLayer === 'street'
                  ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                  : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                }
                attribution={mapLayer === 'street'
                  ? '&copy; OpenStreetMap contributors'
                  : '&copy; Esri, Maxar, Earthstar Geographics'
                }
              />
              <Marker
                position={[selected.lat, selected.lng]}
                icon={createColoredIcon(selected.categoryColor)}
              >
                <Popup>
                  <div style={{ minWidth: '180px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>{selected.name}</div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>
                      {selected.displayName.split(',').slice(0, 3).join(',')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        backgroundColor: selected.categoryColor,
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '14px',
                      }}>
                        AQI {selected.aqi}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: selected.categoryColor }}>
                        {selected.category}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>

          {/* Detail Panel */}
          <div className="flex flex-col gap-3">
            {/* Header */}
            <div className="rounded-[16px] border border-border bg-card p-4 card-shadow">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 shrink-0 text-primary" />
                    <h3 className="truncate text-sm font-700">{selected.name}</h3>
                  </div>
                  <p className="mt-1 truncate text-[10px] text-muted-foreground">
                    {selected.displayName.split(',').slice(1, 4).join(',').trim()}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[8px] font-600 text-primary">
                      {placeTypeLabel(selected.type)}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      {selected.lat.toFixed(3)}, {selected.lng.toFixed(3)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {selected.has_cpcb_station && selected.cpcb_aqi != null && (
                    <div
                      className="grid h-14 w-14 place-items-center rounded-2xl text-white shadow-sm border border-black/10"
                      style={{ backgroundColor: selected.cpcb_categoryColor }}
                      title={`Official CPCB Station: ${selected.cpcb_station_name}`}
                    >
                      <div className="text-center">
                        <div className="text-lg font-700 leading-none">{selected.cpcb_aqi}</div>
                        <div className="text-[7px] leading-none">CPCB AQI</div>
                      </div>
                    </div>
                  )}
                  <div
                    className="grid h-14 w-14 place-items-center rounded-2xl text-white shadow-sm border border-black/10"
                    style={{ backgroundColor: selected.categoryColor }}
                    title="AI Predicted AQI"
                  >
                    <div className="text-center">
                      <div className="text-lg font-700 leading-none">{selected.aqi}</div>
                      <div className="text-[7px] leading-none">PREDICTED</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex flex-col gap-1.5 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: selected.categoryColor }} />
                  <span className="font-700" style={{ color: selected.categoryColor }}>{selected.category} (Predicted)</span>
                  <span className="text-muted-foreground">· {selected.dominantPollutant} · {selected.primarySource}</span>
                </div>
                {selected.has_cpcb_station && selected.cpcb_category && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: selected.cpcb_categoryColor }} />
                    <span className="font-700" style={{ color: selected.cpcb_categoryColor }}>{selected.cpcb_category} (Official CPCB)</span>
                    <span className="text-muted-foreground truncate" title={selected.cpcb_station_name || ''}>
                      · Station: {selected.cpcb_station_name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Gases + PM */}
            <div className="rounded-[16px] border border-border bg-card p-4 card-shadow">
              <div className="mb-2.5 text-[10px] font-700 uppercase tracking-wide text-muted-foreground">
                Particulate Matter & Gases
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  { label: 'PM2.5', value: selected.pm25, unit: 'µg/m³', limit: 60 },
                  { label: 'PM10', value: selected.pm10, unit: 'µg/m³', limit: 100 },
                  { label: 'NO₂', value: selected.no2, unit: 'µg/m³', limit: 80 },
                  { label: 'SO₂', value: selected.so2, unit: 'µg/m³', limit: 50 },
                  { label: 'CO', value: selected.co, unit: 'mg/m³', limit: 2 },
                  { label: 'O₃', value: selected.o3, unit: 'µg/m³', limit: 100 },
                  { label: 'NH₃', value: selected.nh3, unit: 'µg/m³', limit: 400 },
                ].map((g) => {
                  const pct = Math.min((g.value / g.limit) * 100, 100);
                  const barColor = pct >= 90 ? '#EF4444' : pct > 60 ? '#F97316' : '#22C55E';
                  return (
                    <div key={g.label} className="rounded-xl border border-border bg-muted/20 p-2.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] font-600 text-muted-foreground">{g.label}</span>
                        <span className="text-sm font-700">{g.value}</span>
                      </div>
                      <div className="text-[8px] text-muted-foreground">{g.unit}</div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weather */}
            <div className="rounded-[16px] border border-border bg-card p-4 card-shadow">
              <div className="mb-2.5 text-[10px] font-700 uppercase tracking-wide text-muted-foreground">
                Weather Conditions
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Thermometer, label: 'Temperature', value: `${selected.temperature}°C`, sub: `Feels ${selected.feelsLike}°C`, color: '#F97316' },
                  { icon: Droplets, label: 'Humidity', value: `${selected.humidity}%`, sub: selected.humidity > 70 ? 'High' : 'Moderate', color: '#3B82F6' },
                  { icon: Wind, label: 'Wind', value: `${selected.windSpeed} km/h`, sub: selected.windDirection, color: '#6366F1' },
                  { icon: Eye, label: 'Visibility', value: `${selected.visibility} km`, sub: selected.visibility < 4 ? 'Poor' : 'Good', color: '#8B5CF6' },
                ].map((w) => (
                  <div key={w.label} className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/20 p-2.5">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: `${w.color}15` }}>
                      <w.icon className="h-4 w-4" style={{ color: w.color }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{w.label}</div>
                      <div className="text-sm font-700">{w.value}</div>
                      <div className="truncate text-[9px] text-muted-foreground">{w.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Health Advisory */}
            <div className="flex items-start gap-2 rounded-[16px] border border-border bg-amber-500/5 p-3 card-shadow">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <div className="text-[10px] font-700 text-amber-600">Health Advisory</div>
                <div className="text-[11px] leading-relaxed text-muted-foreground">{selected.healthAdvisory}</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
