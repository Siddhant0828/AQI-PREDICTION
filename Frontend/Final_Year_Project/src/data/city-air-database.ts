export interface CityAirData {
  city: string;
  state: string;
  lat: number;
  lng: number;
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
  updated: string;
}

function cat(aqi: number): { category: string; color: string } {
  if (aqi <= 50) return { category: 'Good', color: '#22C55E' };
  if (aqi <= 100) return { category: 'Satisfactory', color: '#84CC16' };
  if (aqi <= 200) return { category: 'Moderate', color: '#EAB308' };
  if (aqi <= 300) return { category: 'Poor', color: '#F97316' };
  if (aqi <= 400) return { category: 'Very Poor', color: '#EF4444' };
  return { category: 'Severe', color: '#7E0023' };
}

function advisory(aqi: number): string {
  if (aqi <= 50) return 'Air quality is good. Safe for all outdoor activities.';
  if (aqi <= 100) return 'Acceptable air quality. Sensitive individuals may experience minor discomfort.';
  if (aqi <= 200) return 'Moderate pollution. Sensitive groups should limit prolonged outdoor exertion.';
  if (aqi <= 300) return 'Poor air quality. Everyone may experience health effects. Limit outdoor activities.';
  if (aqi <= 400) return 'Very poor air quality. Avoid outdoor activities. Use N95 masks if going outside.';
  return 'Severe pollution. Emergency conditions. Stay indoors. Use air purifiers.';
}

const rawCities: Omit<CityAirData, 'category' | 'categoryColor' | 'healthAdvisory'>[] = [
  { city: 'New Delhi', state: 'Delhi', lat: 28.61, lng: 77.21, aqi: 412, pm25: 142, pm10: 198, no2: 78, so2: 22, co: 1.4, o3: 64, nh3: 19, temperature: 32, humidity: 68, windSpeed: 12, windDirection: 'NW', feelsLike: 38, visibility: 2.1, dominantPollutant: 'PM2.5', primarySource: 'Vehicular + Stubble burning', updated: '10:15 AM IST' },
  { city: 'Mumbai', state: 'Maharashtra', lat: 19.08, lng: 72.88, aqi: 167, pm25: 89, pm10: 142, no2: 52, so2: 14, co: 0.9, o3: 48, nh3: 12, temperature: 31, humidity: 74, windSpeed: 18, windDirection: 'SW', feelsLike: 36, visibility: 4.5, dominantPollutant: 'PM2.5', primarySource: 'Vehicular + Industrial', updated: '10:15 AM IST' },
  { city: 'Kolkata', state: 'West Bengal', lat: 22.57, lng: 88.36, aqi: 287, pm25: 128, pm10: 178, no2: 68, so2: 18, co: 1.2, o3: 55, nh3: 15, temperature: 30, humidity: 72, windSpeed: 10, windDirection: 'NE', feelsLike: 35, visibility: 3.2, dominantPollutant: 'PM2.5', primarySource: 'Vehicular + Industrial', updated: '10:15 AM IST' },
  { city: 'Chennai', state: 'Tamil Nadu', lat: 13.08, lng: 80.27, aqi: 132, pm25: 72, pm10: 118, no2: 42, so2: 12, co: 0.7, o3: 52, nh3: 10, temperature: 33, humidity: 76, windSpeed: 16, windDirection: 'SE', feelsLike: 39, visibility: 5.0, dominantPollutant: 'O3', primarySource: 'Vehicular + Construction', updated: '10:15 AM IST' },
  { city: 'Bengaluru', state: 'Karnataka', lat: 12.97, lng: 77.59, aqi: 98, pm25: 48, pm10: 82, no2: 35, so2: 10, co: 0.5, o3: 45, nh3: 8, temperature: 27, humidity: 62, windSpeed: 14, windDirection: 'SW', feelsLike: 29, visibility: 6.5, dominantPollutant: 'PM10', primarySource: 'Vehicular + Construction', updated: '10:15 AM IST' },
  { city: 'Hyderabad', state: 'Telangana', lat: 17.39, lng: 78.49, aqi: 189, pm25: 98, pm10: 152, no2: 48, so2: 13, co: 0.8, o3: 50, nh3: 11, temperature: 31, humidity: 65, windSpeed: 13, windDirection: 'S', feelsLike: 35, visibility: 4.8, dominantPollutant: 'PM2.5', primarySource: 'Vehicular + Industrial', updated: '10:15 AM IST' },
  { city: 'Pune', state: 'Maharashtra', lat: 18.52, lng: 73.85, aqi: 145, pm25: 78, pm10: 128, no2: 45, so2: 11, co: 0.7, o3: 46, nh3: 9, temperature: 29, humidity: 60, windSpeed: 15, windDirection: 'SW', feelsLike: 31, visibility: 5.5, dominantPollutant: 'PM2.5', primarySource: 'Vehicular + Industrial', updated: '10:15 AM IST' },
  { city: 'Ahmedabad', state: 'Gujarat', lat: 23.02, lng: 72.57, aqi: 224, pm25: 112, pm10: 168, no2: 58, so2: 16, co: 1.0, o3: 54, nh3: 13, temperature: 34, humidity: 55, windSpeed: 11, windDirection: 'NW', feelsLike: 37, visibility: 3.8, dominantPollutant: 'PM2.5', primarySource: 'Industrial + Vehicular', updated: '10:15 AM IST' },
  { city: 'Jaipur', state: 'Rajasthan', lat: 26.91, lng: 75.79, aqi: 248, pm25: 128, pm10: 182, no2: 62, so2: 17, co: 1.1, o3: 58, nh3: 14, temperature: 35, humidity: 48, windSpeed: 10, windDirection: 'NW', feelsLike: 38, visibility: 3.5, dominantPollutant: 'PM2.5', primarySource: 'Vehicular + Dust', updated: '10:15 AM IST' },
  { city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.85, lng: 80.95, aqi: 358, pm25: 168, pm10: 228, no2: 72, so2: 20, co: 1.3, o3: 60, nh3: 16, temperature: 31, humidity: 70, windSpeed: 9, windDirection: 'N', feelsLike: 37, visibility: 2.8, dominantPollutant: 'PM2.5', primarySource: 'Vehicular + Stubble burning', updated: '10:15 AM IST' },
  { city: 'Patna', state: 'Bihar', lat: 25.59, lng: 85.14, aqi: 312, pm25: 148, pm10: 208, no2: 68, so2: 19, co: 1.2, o3: 56, nh3: 15, temperature: 30, humidity: 71, windSpeed: 8, windDirection: 'NE', feelsLike: 35, visibility: 3.0, dominantPollutant: 'PM2.5', primarySource: 'Vehicular + Industrial', updated: '10:15 AM IST' },
  { city: 'Kanpur', state: 'Uttar Pradesh', lat: 26.45, lng: 80.33, aqi: 335, pm25: 155, pm10: 215, no2: 70, so2: 21, co: 1.3, o3: 58, nh3: 16, temperature: 31, humidity: 69, windSpeed: 8, windDirection: 'N', feelsLike: 36, visibility: 2.9, dominantPollutant: 'PM2.5', primarySource: 'Industrial + Vehicular', updated: '10:15 AM IST' },
  { city: 'Nagpur', state: 'Maharashtra', lat: 21.15, lng: 79.09, aqi: 178, pm25: 92, pm10: 138, no2: 48, so2: 13, co: 0.8, o3: 50, nh3: 10, temperature: 33, humidity: 58, windSpeed: 12, windDirection: 'SW', feelsLike: 36, visibility: 4.2, dominantPollutant: 'PM2.5', primarySource: 'Industrial + Vehicular', updated: '10:15 AM IST' },
  { city: 'Indore', state: 'Madhya Pradesh', lat: 22.72, lng: 75.86, aqi: 156, pm25: 82, pm10: 128, no2: 44, so2: 12, co: 0.7, o3: 47, nh3: 9, temperature: 32, humidity: 56, windSpeed: 13, windDirection: 'W', feelsLike: 35, visibility: 4.8, dominantPollutant: 'PM2.5', primarySource: 'Vehicular + Industrial', updated: '10:15 AM IST' },
  { city: 'Bhopal', state: 'Madhya Pradesh', lat: 23.25, lng: 77.41, aqi: 134, pm25: 72, pm10: 112, no2: 40, so2: 11, co: 0.6, o3: 45, nh3: 8, temperature: 31, humidity: 58, windSpeed: 14, windDirection: 'W', feelsLike: 34, visibility: 5.2, dominantPollutant: 'PM10', primarySource: 'Vehicular + Dust', updated: '10:15 AM IST' },
  { city: 'Surat', state: 'Gujarat', lat: 21.17, lng: 72.83, aqi: 172, pm25: 88, pm10: 134, no2: 46, so2: 14, co: 0.8, o3: 48, nh3: 11, temperature: 33, humidity: 62, windSpeed: 14, windDirection: 'SW', feelsLike: 37, visibility: 4.5, dominantPollutant: 'PM2.5', primarySource: 'Industrial + Vehicular', updated: '10:15 AM IST' },
  { city: 'Vadodara', state: 'Gujarat', lat: 22.31, lng: 73.18, aqi: 162, pm25: 84, pm10: 126, no2: 44, so2: 13, co: 0.7, o3: 46, nh3: 10, temperature: 33, humidity: 60, windSpeed: 13, windDirection: 'SW', feelsLike: 36, visibility: 4.8, dominantPollutant: 'PM2.5', primarySource: 'Industrial + Vehicular', updated: '10:15 AM IST' },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.69, lng: 83.22, aqi: 112, pm25: 62, pm10: 98, no2: 38, so2: 15, co: 0.6, o3: 48, nh3: 8, temperature: 32, humidity: 72, windSpeed: 16, windDirection: 'SE', feelsLike: 37, visibility: 5.5, dominantPollutant: 'SO2', primarySource: 'Industrial + Port', updated: '10:15 AM IST' },
  { city: 'Coimbatore', state: 'Tamil Nadu', lat: 11.02, lng: 76.96, aqi: 78, pm25: 38, pm10: 68, no2: 28, so2: 9, co: 0.4, o3: 42, nh3: 6, temperature: 30, humidity: 68, windSpeed: 15, windDirection: 'SW', feelsLike: 33, visibility: 7.0, dominantPollutant: 'PM10', primarySource: 'Industrial + Vehicular', updated: '10:15 AM IST' },
  { city: 'Kochi', state: 'Kerala', lat: 9.93, lng: 76.27, aqi: 65, pm25: 32, pm10: 58, no2: 25, so2: 8, co: 0.3, o3: 40, nh3: 5, temperature: 31, humidity: 78, windSpeed: 18, windDirection: 'SW', feelsLike: 36, visibility: 8.0, dominantPollutant: 'PM10', primarySource: 'Vehicular + Port', updated: '10:15 AM IST' },
  { city: 'Thiruvananthapuram', state: 'Kerala', lat: 8.52, lng: 76.95, aqi: 52, pm25: 25, pm10: 48, no2: 22, so2: 7, co: 0.3, o3: 38, nh3: 4, temperature: 31, humidity: 80, windSpeed: 20, windDirection: 'SW', feelsLike: 37, visibility: 8.5, dominantPollutant: 'PM10', primarySource: 'Vehicular', updated: '10:15 AM IST' },
  { city: 'Guwahati', state: 'Assam', lat: 26.14, lng: 91.74, aqi: 198, pm25: 105, pm10: 158, no2: 52, so2: 14, co: 0.9, o3: 50, nh3: 11, temperature: 28, humidity: 75, windSpeed: 10, windDirection: 'NE', feelsLike: 32, visibility: 4.0, dominantPollutant: 'PM2.5', primarySource: 'Vehicular + Industrial', updated: '10:15 AM IST' },
  { city: 'Bhubaneswar', state: 'Odisha', lat: 20.27, lng: 85.84, aqi: 142, pm25: 75, pm10: 118, no2: 42, so2: 13, co: 0.7, o3: 48, nh3: 9, temperature: 32, humidity: 68, windSpeed: 14, windDirection: 'S', feelsLike: 37, visibility: 5.0, dominantPollutant: 'PM2.5', primarySource: 'Vehicular + Industrial', updated: '10:15 AM IST' },
  { city: 'Amritsar', state: 'Punjab', lat: 31.63, lng: 74.87, aqi: 298, pm25: 142, pm10: 198, no2: 65, so2: 18, co: 1.2, o3: 56, nh3: 14, temperature: 28, humidity: 62, windSpeed: 8, windDirection: 'NW', feelsLike: 30, visibility: 3.0, dominantPollutant: 'PM2.5', primarySource: 'Stubble burning + Vehicular', updated: '10:15 AM IST' },
  { city: 'Chandigarh', state: 'Chandigarh', lat: 30.73, lng: 76.78, aqi: 252, pm25: 128, pm10: 178, no2: 58, so2: 16, co: 1.0, o3: 52, nh3: 12, temperature: 29, humidity: 60, windSpeed: 9, windDirection: 'NW', feelsLike: 31, visibility: 3.5, dominantPollutant: 'PM2.5', primarySource: 'Vehicular + Stubble burning', updated: '10:15 AM IST' },
  { city: 'Ludhiana', state: 'Punjab', lat: 30.90, lng: 75.85, aqi: 278, pm25: 135, pm10: 188, no2: 62, so2: 17, co: 1.1, o3: 54, nh3: 13, temperature: 29, humidity: 63, windSpeed: 8, windDirection: 'NW', feelsLike: 31, visibility: 3.2, dominantPollutant: 'PM2.5', primarySource: 'Industrial + Stubble burning', updated: '10:15 AM IST' },
  { city: 'Agra', state: 'Uttar Pradesh', lat: 27.18, lng: 78.00, aqi: 268, pm25: 132, pm10: 182, no2: 60, so2: 17, co: 1.1, o3: 53, nh3: 13, temperature: 33, humidity: 55, windSpeed: 9, windDirection: 'N', feelsLike: 37, visibility: 3.3, dominantPollutant: 'PM2.5', primarySource: 'Vehicular + Industrial', updated: '10:15 AM IST' },
  { city: 'Varanasi', state: 'Uttar Pradesh', lat: 25.32, lng: 82.97, aqi: 285, pm25: 138, pm10: 192, no2: 64, so2: 18, co: 1.2, o3: 55, nh3: 14, temperature: 31, humidity: 66, windSpeed: 8, windDirection: 'NE', feelsLike: 35, visibility: 3.0, dominantPollutant: 'PM2.5', primarySource: 'Industrial + Vehicular', updated: '10:15 AM IST' },
  { city: 'Ranchi', state: 'Jharkhand', lat: 23.36, lng: 85.33, aqi: 128, pm25: 68, pm10: 108, no2: 38, so2: 12, co: 0.6, o3: 46, nh3: 8, temperature: 28, humidity: 64, windSpeed: 12, windDirection: 'NE', feelsLike: 31, visibility: 5.5, dominantPollutant: 'PM10', primarySource: 'Industrial + Mining', updated: '10:15 AM IST' },
  { city: 'Raipur', state: 'Chhattisgarh', lat: 21.25, lng: 81.63, aqi: 182, pm25: 95, pm10: 142, no2: 48, so2: 16, co: 0.9, o3: 49, nh3: 10, temperature: 32, humidity: 60, windSpeed: 11, windDirection: 'S', feelsLike: 36, visibility: 4.2, dominantPollutant: 'PM2.5', primarySource: 'Industrial + Power plants', updated: '10:15 AM IST' },
  { city: 'Dehradun', state: 'Uttarakhand', lat: 30.32, lng: 78.03, aqi: 165, pm25: 85, pm10: 132, no2: 44, so2: 12, co: 0.7, o3: 48, nh3: 9, temperature: 26, humidity: 58, windSpeed: 10, windDirection: 'N', feelsLike: 27, visibility: 4.8, dominantPollutant: 'PM2.5', primarySource: 'Vehicular + Construction', updated: '10:15 AM IST' },
  { city: 'Shimla', state: 'Himachal Pradesh', lat: 31.10, lng: 77.17, aqi: 48, pm25: 22, pm10: 42, no2: 18, so2: 6, co: 0.2, o3: 35, nh3: 3, temperature: 18, humidity: 55, windSpeed: 12, windDirection: 'NW', feelsLike: 16, visibility: 10.0, dominantPollutant: 'PM10', primarySource: 'Vehicular', updated: '10:15 AM IST' },
  { city: 'Gangtok', state: 'Sikkim', lat: 27.33, lng: 88.61, aqi: 42, pm25: 18, pm10: 35, no2: 15, so2: 5, co: 0.2, o3: 32, nh3: 3, temperature: 20, humidity: 68, windSpeed: 14, windDirection: 'NE', feelsLike: 19, visibility: 12.0, dominantPollutant: 'PM10', primarySource: 'Natural', updated: '10:15 AM IST' },
  { city: 'Shillong', state: 'Meghalaya', lat: 25.58, lng: 91.89, aqi: 55, pm25: 26, pm10: 50, no2: 20, so2: 7, co: 0.3, o3: 38, nh3: 4, temperature: 22, humidity: 72, windSpeed: 15, windDirection: 'NE', feelsLike: 23, visibility: 9.0, dominantPollutant: 'PM10', primarySource: 'Vehicular', updated: '10:15 AM IST' },
  { city: 'Jodhpur', state: 'Rajasthan', lat: 26.29, lng: 73.02, aqi: 198, pm25: 102, pm10: 152, no2: 52, so2: 14, co: 0.9, o3: 52, nh3: 11, temperature: 36, humidity: 42, windSpeed: 14, windDirection: 'NW', feelsLike: 39, visibility: 4.0, dominantPollutant: 'PM10', primarySource: 'Dust + Industrial', updated: '10:15 AM IST' },
  { city: 'Udaipur', state: 'Rajasthan', lat: 24.59, lng: 73.68, aqi: 145, pm25: 75, pm10: 118, no2: 42, so2: 11, co: 0.6, o3: 46, nh3: 8, temperature: 34, humidity: 48, windSpeed: 12, windDirection: 'SW', feelsLike: 37, visibility: 5.0, dominantPollutant: 'PM10', primarySource: 'Dust + Vehicular', updated: '10:15 AM IST' },
  { city: 'Gwalior', state: 'Madhya Pradesh', lat: 26.22, lng: 78.18, aqi: 215, pm25: 108, pm10: 162, no2: 55, so2: 15, co: 1.0, o3: 51, nh3: 12, temperature: 34, humidity: 52, windSpeed: 10, windDirection: 'N', feelsLike: 37, visibility: 3.8, dominantPollutant: 'PM2.5', primarySource: 'Industrial + Dust', updated: '10:15 AM IST' },
  { city: 'Nashik', state: 'Maharashtra', lat: 19.99, lng: 73.79, aqi: 118, pm25: 62, pm10: 98, no2: 38, so2: 10, co: 0.5, o3: 44, nh3: 7, temperature: 30, humidity: 58, windSpeed: 14, windDirection: 'SW', feelsLike: 32, visibility: 5.8, dominantPollutant: 'PM10', primarySource: 'Industrial + Vehicular', updated: '10:15 AM IST' },
  { city: 'Faridabad', state: 'Haryana', lat: 28.40, lng: 77.31, aqi: 348, pm25: 162, pm10: 222, no2: 70, so2: 19, co: 1.3, o3: 58, nh3: 15, temperature: 32, humidity: 65, windSpeed: 9, windDirection: 'NW', feelsLike: 38, visibility: 2.5, dominantPollutant: 'PM2.5', primarySource: 'Industrial + Vehicular', updated: '10:15 AM IST' },
  { city: 'Gurugram', state: 'Haryana', lat: 28.46, lng: 77.03, aqi: 365, pm25: 172, pm10: 235, no2: 74, so2: 20, co: 1.4, o3: 60, nh3: 16, temperature: 32, humidity: 64, windSpeed: 9, windDirection: 'NW', feelsLike: 38, visibility: 2.3, dominantPollutant: 'PM2.5', primarySource: 'Vehicular + Construction', updated: '10:15 AM IST' },
  { city: 'Noida', state: 'Uttar Pradesh', lat: 28.54, lng: 77.39, aqi: 378, pm25: 178, pm10: 242, no2: 76, so2: 21, co: 1.5, o3: 62, nh3: 17, temperature: 32, humidity: 66, windSpeed: 8, windDirection: 'NW', feelsLike: 38, visibility: 2.2, dominantPollutant: 'PM2.5', primarySource: 'Vehicular + Industrial', updated: '10:15 AM IST' },
];

export const cityAirDatabase: CityAirData[] = rawCities.map((c) => {
  const { category, color } = cat(c.aqi);
  return {
    ...c,
    category,
    categoryColor: color,
    healthAdvisory: advisory(c.aqi),
  };
});
