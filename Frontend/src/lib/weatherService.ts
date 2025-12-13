// Weather Service - Fetch real-time weather and terrain conditions
// Uses OpenWeatherMap API for weather data along the route

export interface WeatherData {
  temperature: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  icon: string;
  clouds: number;
  rain?: number;
  snow?: number;
}

export interface RouteWeatherData {
  location: { lat: number; lng: number; name: string };
  weather: WeatherData;
  timestamp: string;
  terrainCondition: 'CLEAR' | 'CAUTION' | 'HAZARDOUS';
  hazardLevel: number; // 0-100
}

const OPENWEATHER_API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || ''; // Add your API key
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

/**
 * Fetch current weather for a specific location
 */
export async function fetchWeatherForLocation(
  lat: number,
  lng: number,
  locationName?: string
): Promise<RouteWeatherData> {
  try {
    // Check if API key is configured
    if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === '') {
      console.warn('OpenWeatherMap API key not configured. Using mock weather data.');
      return generateMockWeatherData(lat, lng, locationName);
    }

    const response = await fetch(
      `${OPENWEATHER_BASE_URL}/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );

    if (!response.ok) {
      if (response.status === 401) {
        console.error('Weather API: Invalid API key (401). Using mock data.');
      } else {
        console.error(`Weather API error: ${response.status}. Using mock data.`);
      }
      return generateMockWeatherData(lat, lng, locationName);
    }

    const data = await response.json();

    const weatherData: WeatherData = {
      temperature: data.main.temp,
      condition: data.weather[0].main,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      visibility: data.visibility / 1000, // Convert to km
      icon: data.weather[0].icon,
      clouds: data.clouds.all,
      rain: data.rain?.['1h'],
      snow: data.snow?.['1h'],
    };

    // Determine terrain condition based on weather
    const { terrainCondition, hazardLevel } = assessTerrainCondition(weatherData);

    return {
      location: { lat, lng, name: locationName || data.name },
      weather: weatherData,
      timestamp: new Date().toISOString(),
      terrainCondition,
      hazardLevel,
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    return generateMockWeatherData(lat, lng, locationName);
  }
}

/**
 * Generate realistic mock weather data when API is unavailable
 */
function generateMockWeatherData(
  lat: number,
  lng: number,
  locationName?: string
): RouteWeatherData {
  // Generate varied weather based on location
  const conditions = ['Clear', 'Clouds', 'Rain', 'Mist'];
  const condition = conditions[Math.floor(Math.random() * conditions.length)];
  
  const weatherData: WeatherData = {
    temperature: 15 + Math.random() * 15, // 15-30°C
    condition,
    description: condition.toLowerCase() + ' sky',
    humidity: 40 + Math.random() * 40, // 40-80%
    windSpeed: 5 + Math.random() * 15, // 5-20 km/h
    visibility: 8 + Math.random() * 2, // 8-10 km
    icon: condition === 'Clear' ? '01d' : condition === 'Clouds' ? '03d' : '10d',
    clouds: condition === 'Clouds' ? 60 + Math.random() * 30 : 20,
    rain: condition === 'Rain' ? 2 + Math.random() * 3 : undefined,
  };

  const { terrainCondition, hazardLevel } = assessTerrainCondition(weatherData);

  return {
    location: { lat, lng, name: locationName || 'Location' },
    weather: weatherData,
    timestamp: new Date().toISOString(),
    terrainCondition,
    hazardLevel,
  };
}

/**
 * Fetch weather for multiple points along a route
 */
export async function fetchRouteWeather(
  waypoints: Array<{ lat: number; lng: number; name?: string }>
): Promise<RouteWeatherData[]> {
  const weatherPromises = waypoints.map((point) =>
    fetchWeatherForLocation(point.lat, point.lng, point.name)
  );

  return Promise.all(weatherPromises);
}

/**
 * Assess terrain condition based on weather data
 */
function assessTerrainCondition(weather: WeatherData): {
  terrainCondition: 'CLEAR' | 'CAUTION' | 'HAZARDOUS';
  hazardLevel: number;
} {
  let hazardLevel = 0;

  // Rain hazard (0-30 points)
  if (weather.rain) {
    hazardLevel += Math.min(weather.rain * 10, 30);
  }

  // Snow hazard (0-40 points)
  if (weather.snow) {
    hazardLevel += Math.min(weather.snow * 15, 40);
  }

  // Wind hazard (0-20 points)
  if (weather.windSpeed > 15) {
    hazardLevel += Math.min((weather.windSpeed - 15) * 2, 20);
  }

  // Visibility hazard (0-30 points)
  if (weather.visibility < 5) {
    hazardLevel += Math.min((5 - weather.visibility) * 6, 30);
  }

  // Cloud cover impact (0-10 points)
  if (weather.clouds > 80) {
    hazardLevel += Math.min((weather.clouds - 80) / 2, 10);
  }

  // Temperature extremes (0-20 points)
  if (weather.temperature < 0 || weather.temperature > 40) {
    hazardLevel += Math.min(Math.abs(weather.temperature - 20), 20);
  }

  // Determine condition based on hazard level
  let terrainCondition: 'CLEAR' | 'CAUTION' | 'HAZARDOUS';
  if (hazardLevel < 30) {
    terrainCondition = 'CLEAR';
  } else if (hazardLevel < 60) {
    terrainCondition = 'CAUTION';
  } else {
    terrainCondition = 'HAZARDOUS';
  }

  return { terrainCondition, hazardLevel: Math.min(hazardLevel, 100) };
}

/**
 * Get weather icon emoji
 */
export function getWeatherEmoji(condition: string): string {
  const emojiMap: Record<string, string> = {
    Clear: '☀️',
    Clouds: '☁️',
    Rain: '🌧️',
    Drizzle: '🌦️',
    Thunderstorm: '⛈️',
    Snow: '🌨️',
    Mist: '🌫️',
    Smoke: '🌫️',
    Haze: '🌫️',
    Dust: '🌪️',
    Fog: '🌫️',
    Sand: '🌪️',
    Ash: '🌋',
    Squall: '💨',
    Tornado: '🌪️',
  };

  return emojiMap[condition] || '🌤️';
}

/**
 * Get terrain condition color
 */
export function getTerrainConditionColor(condition: 'CLEAR' | 'CAUTION' | 'HAZARDOUS'): string {
  switch (condition) {
    case 'CLEAR':
      return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';
    case 'CAUTION':
      return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40';
    case 'HAZARDOUS':
      return 'text-red-400 bg-red-500/20 border-red-500/40';
  }
}

/**
 * Format temperature with unit
 */
export function formatTemperature(temp: number): string {
  return `${Math.round(temp)}°C`;
}

/**
 * Format wind speed
 */
export function formatWindSpeed(speed: number): string {
  return `${Math.round(speed)} km/h`;
}
