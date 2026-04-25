import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CloudSun } from 'lucide-react';

const WEATHER_EMOJI = (code) => {
  if (code===0) return '☀️';
  if (code<=2) return '⛅';
  if (code===3) return '☁️';
  if (code<=49) return '🌫️';
  if (code<=57) return '🌧️';
  if (code<=67) return '🌧️';
  if (code<=77) return '🌨️';
  if (code<=82) return '🌦️';
  if (code<=99) return '⛈️';
  return '🌡️';
};

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchWeather() {
      try {
        const geo = await fetch('https://ipapi.co/json/');
        const g = await geo.json();
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&current_weather=true`
        );
        const d = await res.json();
        setWeather({
          temp: Math.round(d.current_weather.temperature),
          code: d.current_weather.weathercode,
          wind: d.current_weather.windspeed,
          location: `${g.city}, ${g.country_code}`,
        });
      } catch { setError(true); }
      finally { setLoading(false); }
    }
    fetchWeather();
    const id = setInterval(fetchWeather, 15*60*1000);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div className="widget widget-weather" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
      {loading ? (
        <div className="widget-loading"><CloudSun size={24} className="animate-pulse" /><span>Loading…</span></div>
      ) : error ? (
        <div className="widget-error">❓ Weather unavailable</div>
      ) : weather && (
        <div className="weather-content">
          <div className="weather-icon">{WEATHER_EMOJI(weather.code)}</div>
          <div>
            <div className="weather-temp">{weather.temp}°C</div>
            <div className="weather-location">{weather.location}</div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
