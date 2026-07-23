export interface KPICard {
  id: string;
  label: string;
  value: number;
  unit?: string;
  category?: string;
  categoryColor?: string;
  trend?: number;
  trendDirection?: 'up' | 'down';
  icon: string;
}

export interface CityAqi {
  city: string;
  state: string;
  aqi: number;
  category: string;
  trend: number;
}

export interface AqiTrendPoint {
  date: string;
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
}

export interface Hotspot {
  id: string;
  location: string;
  state: string;
  lat: number;
  lng: number;
  hcho: number;
  fires: number;
  intensity: 'high' | 'medium' | 'low';
}

export interface SourceContribution {
  source: string;
  percentage: number;
  color: string;
  description: string;
}

export interface AlertItem {
  id: string;
  title: string;
  severity: 'red' | 'orange' | 'yellow';
  region: string;
  time: string;
  description: string;
  aqi: number;
  channels: { sms: boolean; email: boolean; push: boolean };
}

export interface PipelineStage {
  id: string;
  name: string;
  status: 'complete' | 'running' | 'queued';
  progress: number;
  duration: string;
  description: string;
}

export interface DataSource {
  name: string;
  status: 'operational' | 'degraded' | 'offline';
  lastSync: string;
  coverage: number;
}

export interface ForecastPoint {
  date: string;
  predicted: number;
  confidence: number;
}
