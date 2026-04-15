// ── 32 PROVINCIAS DE RD CON COORDENADAS ──────────────────────
const PROVINCIAS = [
    { nombre: 'Distrito Nacional', lat: 18.4861, lng: -69.9312 },
    { nombre: 'Santiago', lat: 19.4517, lng: -70.6970 },
    { nombre: 'Santo Domingo', lat: 18.5001, lng: -69.9887 },
    { nombre: 'La Altagracia', lat: 18.6200, lng: -68.7000 },
    { nombre: 'San Cristóbal', lat: 18.4167, lng: -70.1000 },
    { nombre: 'La Romana', lat: 18.4273, lng: -68.9728 },
    { nombre: 'Puerto Plata', lat: 19.7933, lng: -70.6883 },
    { nombre: 'San Pedro de Macorís', lat: 18.4538, lng: -69.3047 },
    { nombre: 'Duarte', lat: 19.3000, lng: -70.3333 },
    { nombre: 'La Vega', lat: 19.2167, lng: -70.5167 },
    { nombre: 'Espaillat', lat: 19.6000, lng: -70.4167 },
    { nombre: 'San Juan', lat: 18.8056, lng: -71.2278 },
    { nombre: 'Barahona', lat: 18.2000, lng: -71.1000 },
    { nombre: 'Monte Cristi', lat: 19.8500, lng: -71.6500 },
    { nombre: 'María Trinidad Sánchez', lat: 19.3833, lng: -69.8500 },
    { nombre: 'Samaná', lat: 19.2067, lng: -69.3367 },
    { nombre: 'Sánchez Ramírez', lat: 18.9833, lng: -70.1500 },
    { nombre: 'Monseñor Nouel', lat: 18.9167, lng: -70.3833 },
    { nombre: 'Monte Plata', lat: 18.8078, lng: -69.7803 },
    { nombre: 'Hato Mayor', lat: 18.7639, lng: -69.2553 },
    { nombre: 'El Seibo', lat: 18.7653, lng: -69.0400 },
    { nombre: 'Peravia', lat: 18.2667, lng: -70.3333 },
    { nombre: 'Azua', lat: 18.4531, lng: -70.7358 },
    { nombre: 'San José de Ocoa', lat: 18.5483, lng: -70.5069 },
    { nombre: 'Elías Piña', lat: 18.8750, lng: -71.7000 },
    { nombre: 'Dajabón', lat: 19.5500, lng: -71.7000 },
    { nombre: 'Valverde', lat: 19.5792, lng: -70.9833 },
    { nombre: 'Santiago Rodríguez', lat: 19.4833, lng: -71.3333 },
    { nombre: 'Pedernales', lat: 18.0378, lng: -71.7444 },
    { nombre: 'Independencia', lat: 18.5000, lng: -71.8500 },
    { nombre: 'Baoruco', lat: 18.5000, lng: -71.4000 },
    { nombre: 'Hermanas Mirabal', lat: 19.3667, lng: -70.2667 },
];

// ── CÓDIGOS DE CLIMA ──────────────────────────────────────────
function interpretarClima(code, isDay = 1) {
    if (code === 0) return { desc: 'Despejado', emoji: isDay ? '☀️' : '🌙', color: '#f59e0b' };
    if (code <= 2) return { desc: 'Parcialmente nublado', emoji: '⛅', color: '#94a3b8' };
    if (code === 3) return { desc: 'Nublado', emoji: '☁️', color: '#64748b' };
    if (code <= 49) return { desc: 'Niebla', emoji: '🌫️', color: '#94a3b8' };
    if (code <= 57) return { desc: 'Llovizna', emoji: '🌦️', color: '#60a5fa' };
    if (code <= 67) return { desc: 'Lluvia', emoji: '🌧️', color: '#3b82f6' };
    if (code <= 77) return { desc: 'Nieve', emoji: '❄️', color: '#bfdbfe' };
    if (code <= 82) return { desc: 'Aguaceros', emoji: '🌧️', color: '#2563eb' };
    if (code <= 99) return { desc: 'Tormenta', emoji: '⛈️', color: '#c0392b' };
    return { desc: 'Variable', emoji: '🌤️', color: '#94a3b8' };
}

// ── FETCH CLIMA UNA PROVINCIA ─────────────────────────────────
async function fetchClimaProvinca(provincia) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${provincia.lat}&longitude=${provincia.lng}&current_weather=true&hourly=relativehumidity_2m,apparent_temperature,precipitation_probability,uv_index,windspeed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=America/Santo_Domingo&forecast_days=7`;

    const res = await fetch(url);
    const data = await res.json();
    const w = data.current_weather;
    const h = data.hourly;
    const d = data.daily;
    const horaIdx = 0;

    const clima = interpretarClima(w.weathercode, w.is_day);

    return {
        nombre: provincia.nombre,
        lat: provincia.lat,
        lng: provincia.lng,
        temp: Math.round(w.temperature),
        sensacion: Math.round(h.apparent_temperature?.[horaIdx] ?? w.temperature),
        humedad: h.relativehumidity_2m?.[horaIdx] ?? '--',
        viento: Math.round(w.windspeed),
        lluvia: h.precipitation_probability?.[horaIdx] ?? 0,
        uv: Math.round(h.uv_index?.[horaIdx] ?? 0),
        desc: clima.desc,
        emoji: clima.emoji,
        color: clima.color,
        weathercode: w.weathercode,
        pronostico: d.weathercode?.map((code, i) => ({
            code,
            fecha: d.time?.[i],
            max: Math.round(d.temperature_2m_max?.[i] ?? 0),
            min: Math.round(d.temperature_2m_min?.[i] ?? 0),
            lluvia: Math.round(d.precipitation_sum?.[i] ?? 0),
            ...interpretarClima(code),
        })) ?? [],
    };
}

// ── FETCH TODAS LAS PROVINCIAS ────────────────────────────────
async function fetchTodasProvincias() {
    const resultados = await Promise.allSettled(
        PROVINCIAS.map(p => fetchClimaProvinca(p))
    );
    return resultados
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
}