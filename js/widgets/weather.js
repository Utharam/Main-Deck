/**
 * js/widgets/weather.js - Weather Widget (Header Dock with Assisted Location)
 */

import * as store from '../store.js';
import { escapeHtml } from '../ui.js';

let cachedWeather = null;
let lastFetchTime = 0;
let cachedSettingsKey = '';

// Built-in Timezone / GMT offset coordinate dictionary
const TIMEZONE_COORDINATES = {
  'Asia/Karachi': { lat: 24.86, lon: 67.00, name: 'Karachi' },
  'Asia/Calcutta': { lat: 28.61, lon: 77.20, name: 'New Delhi' },
  'Asia/Kolkata': { lat: 28.61, lon: 77.20, name: 'New Delhi' },
  'Asia/Colombo': { lat: 6.92, lon: 79.86, name: 'Colombo' },
  'Asia/Dhaka': { lat: 23.81, lon: 90.41, name: 'Dhaka' },
  'Asia/Dubai': { lat: 25.20, lon: 55.27, name: 'Dubai' },
  'Asia/Riyadh': { lat: 24.71, lon: 46.67, name: 'Riyadh' },
  'Asia/Singapore': { lat: 1.35, lon: 103.82, name: 'Singapore' },
  'Asia/Hong_Kong': { lat: 22.31, lon: 114.16, name: 'Hong Kong' },
  'Asia/Tokyo': { lat: 35.67, lon: 139.65, name: 'Tokyo' },
  'Europe/London': { lat: 51.50, lon: -0.12, name: 'London' },
  'Europe/Paris': { lat: 48.85, lon: 2.35, name: 'Paris' },
  'America/New_York': { lat: 40.71, lon: -74.00, name: 'New York' },
  'America/Los_Angeles': { lat: 34.05, lon: -118.24, name: 'Los Angeles' }
};

export const widget = {
  name: 'weather',
  label: 'Weather',
  icon: '🌦️',

  async render(container) {
    const settings = await store.getAllSettings();
    const currentKey = `${settings.weatherCity || ''}_${settings.weatherLat || ''}_${settings.weatherLon || ''}_${settings.timezone || ''}`;

    const now = Date.now();
    let weather = cachedWeather;

    if (!weather || currentKey !== cachedSettingsKey || now - lastFetchTime > 30 * 60 * 1000) {
      weather = await fetchWeatherSafe(settings);
      if (weather) {
        cachedWeather = weather;
        lastFetchTime = now;
        cachedSettingsKey = currentKey;
      }
    }

    const data = weather || { temp: 24, condition: 'Clear', emoji: '☀️', location: settings.weatherCity || 'Local' };

    container.innerHTML = `
      <a href="#settings" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none; color: var(--color-text-main);" title="Location: ${escapeHtml(data.location)} (${data.condition}). Click to configure in Settings">
        <span style="font-size: 1rem;">${data.emoji}</span>
        <span style="font-weight: 600; font-size: var(--font-size-xs);">${data.temp}°C</span>
        <span style="color: var(--color-text-muted); font-size: var(--font-size-xs);">${escapeHtml(data.location)}</span>
      </a>
    `;
  }
};

export function resolveLocation(settings = {}) {
  if (settings.weatherLat && settings.weatherLon) {
    return {
      lat: Number(settings.weatherLat),
      lon: Number(settings.weatherLon),
      name: settings.weatherCity || `${settings.weatherLat}, ${settings.weatherLon}`
    };
  }

  const tz = settings.timezone || (Intl.DateTimeFormat().resolvedOptions().timeZone);
  if (tz && TIMEZONE_COORDINATES[tz]) {
    return TIMEZONE_COORDINATES[tz];
  }

  const offsetMinutes = -new Date().getTimezoneOffset();
  if (offsetMinutes === 300) return { lat: 24.86, lon: 67.00, name: 'Karachi' };
  if (offsetMinutes === 330) return { lat: 28.61, lon: 77.20, name: 'New Delhi' };
  if (offsetMinutes === 240) return { lat: 25.20, lon: 55.27, name: 'Dubai' };
  if (offsetMinutes === 180) return { lat: 24.71, lon: 46.67, name: 'Riyadh' };
  if (offsetMinutes === 480) return { lat: 1.35, lon: 103.82, name: 'Singapore' };
  if (offsetMinutes === 60) return { lat: 48.85, lon: 2.35, name: 'Paris' };
  if (offsetMinutes === 0) return { lat: 51.50, lon: -0.12, name: 'London' };
  if (offsetMinutes === -300) return { lat: 40.71, lon: -74.00, name: 'New York' };
  if (offsetMinutes === -480) return { lat: 34.05, lon: -118.24, name: 'Los Angeles' };

  return { lat: 24.86, lon: 67.00, name: 'Local' };
}

async function fetchWeatherSafe(settings = {}) {
  try {
    let loc = resolveLocation(settings);

    if (navigator.geolocation && window.isSecureContext && !settings.weatherLat) {
      try {
        const pos = await new Promise((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 2000 });
        });
        loc = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          name: settings.weatherCity || loc.name || 'Local'
        };
      } catch (e) {}
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat.toFixed(2)}&longitude=${loc.lon.toFixed(2)}&current_weather=true`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const json = await res.json();
    const current = json.current_weather;
    if (!current) return null;

    const { condition, emoji } = mapWeatherCode(current.weathercode, current.temperature);

    return {
      temp: Math.round(current.temperature),
      condition,
      emoji,
      location: loc.name
    };
  } catch (err) {
    return null;
  }
}

function mapWeatherCode(code, temp) {
  if (code === 0) return { condition: temp > 32 ? 'Hot' : 'Clear', emoji: temp > 32 ? '🥵' : '☀️' };
  if ([1, 2, 3].includes(code)) return { condition: 'Cloudy', emoji: '☁️' };
  if ([45, 48].includes(code)) return { condition: 'Fog', emoji: '🌫️' };
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { condition: 'Rain', emoji: '🌧️' };
  if ([71, 73, 75, 85, 86].includes(code)) return { condition: 'Snow', emoji: '🌨️' };
  if ([95, 96, 99].includes(code)) return { condition: 'Thunder', emoji: '⛈️' };
  return { condition: 'Clear', emoji: '☀️' };
}
