// Weather Card Component - Display real-time weather conditions along the route

import React from 'react';
import { 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  Wind, 
  Eye, 
  Thermometer,
  Droplets,
  AlertTriangle
} from 'lucide-react';
import { 
  RouteWeatherData, 
  getWeatherEmoji, 
  getTerrainConditionColor,
  formatTemperature,
  formatWindSpeed
} from '@/lib/weatherService';

interface WeatherCardProps {
  weatherData: RouteWeatherData[];
  currentLocationIndex?: number;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ 
  weatherData, 
  currentLocationIndex = 0 
}) => {
  const currentWeather = weatherData[currentLocationIndex];

  if (!currentWeather) {
    return (
      <div className="rounded-xl border border-panelNight/40 bg-panelNight/60 p-4">
        <p className="text-textNeutral/60 text-sm">Loading weather data...</p>
      </div>
    );
  }

  const { weather, terrainCondition, hazardLevel, location } = currentWeather;

  return (
    <div className="rounded-xl border border-panelNight/40 bg-panelNight/60 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-panelNight/80 to-panelNight/60 px-4 py-3 border-b border-panelNight/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-amberCommand" />
            <h3 className="text-sm font-semibold text-textNeutral uppercase tracking-wide">
              Weather Conditions
            </h3>
          </div>
          <span className="text-xs text-textNeutral/60">{location.name}</span>
        </div>
      </div>

      {/* Current Weather */}
      <div className="p-4 space-y-4">
        {/* Main Weather Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-5xl">{getWeatherEmoji(weather.condition)}</div>
            <div>
              <p className="text-3xl font-bold text-textNeutral">
                {formatTemperature(weather.temperature)}
              </p>
              <p className="text-sm text-textNeutral/70 capitalize">{weather.description}</p>
            </div>
          </div>
        </div>

        {/* Terrain Condition Alert */}
        <div className={`rounded-lg border px-3 py-2 ${getTerrainConditionColor(terrainCondition)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase">{terrainCondition}</span>
            </div>
            <span className="text-sm font-bold">Hazard: {hazardLevel}%</span>
          </div>
        </div>

        {/* Weather Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slateDepth/50 p-3">
            <div className="flex items-center gap-2 text-textNeutral/60 text-xs mb-1">
              <Wind className="w-3 h-3" />
              <span>Wind Speed</span>
            </div>
            <p className="text-lg font-semibold text-textNeutral">
              {formatWindSpeed(weather.windSpeed)}
            </p>
          </div>

          <div className="rounded-lg bg-slateDepth/50 p-3">
            <div className="flex items-center gap-2 text-textNeutral/60 text-xs mb-1">
              <Droplets className="w-3 h-3" />
              <span>Humidity</span>
            </div>
            <p className="text-lg font-semibold text-textNeutral">
              {weather.humidity}%
            </p>
          </div>

          <div className="rounded-lg bg-slateDepth/50 p-3">
            <div className="flex items-center gap-2 text-textNeutral/60 text-xs mb-1">
              <Eye className="w-3 h-3" />
              <span>Visibility</span>
            </div>
            <p className="text-lg font-semibold text-textNeutral">
              {weather.visibility.toFixed(1)} km
            </p>
          </div>

          <div className="rounded-lg bg-slateDepth/50 p-3">
            <div className="flex items-center gap-2 text-textNeutral/60 text-xs mb-1">
              <Cloud className="w-3 h-3" />
              <span>Cloud Cover</span>
            </div>
            <p className="text-lg font-semibold text-textNeutral">
              {weather.clouds}%
            </p>
          </div>
        </div>

        {/* Rain/Snow Warning */}
        {(weather.rain || weather.snow) && (
          <div className="rounded-lg bg-orange-950/30 border border-orange-800/40 p-3">
            <div className="flex items-center gap-2">
              {weather.rain ? (
                <CloudRain className="w-4 h-4 text-orange-400" />
              ) : (
                <CloudSnow className="w-4 h-4 text-blue-400" />
              )}
              <div className="flex-1">
                <p className="text-xs text-textNeutral/60 uppercase">Active Precipitation</p>
                <p className="text-sm font-semibold text-textNeutral">
                  {weather.rain ? `Rain: ${weather.rain} mm/h` : `Snow: ${weather.snow} mm/h`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Route Weather Preview */}
        {weatherData.length > 1 && (
          <div className="pt-3 border-t border-panelNight/40">
            <p className="text-xs text-textNeutral/50 uppercase mb-2">Route Forecast</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-stealth">
              {weatherData.map((data, idx) => (
                <div
                  key={idx}
                  className={`flex-shrink-0 rounded-lg border p-2 min-w-[80px] ${
                    idx === currentLocationIndex
                      ? 'border-amberCommand bg-amberCommand/10'
                      : 'border-panelNight/40 bg-panelNight/40'
                  }`}
                >
                  <p className="text-[10px] text-textNeutral/60 mb-1 truncate">
                    {data.location.name}
                  </p>
                  <div className="text-2xl mb-1">{getWeatherEmoji(data.weather.condition)}</div>
                  <p className="text-xs font-semibold text-textNeutral">
                    {formatTemperature(data.weather.temperature)}
                  </p>
                  <div className={`mt-1 rounded px-1 py-0.5 text-[9px] font-semibold ${getTerrainConditionColor(data.terrainCondition)}`}>
                    {data.terrainCondition}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Update Time */}
        <div className="flex items-center justify-center gap-2 text-xs text-textNeutral/50 pt-2 border-t border-panelNight/40">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span>Updated {new Date(currentWeather.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};
