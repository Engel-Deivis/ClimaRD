document.addEventListener('DOMContentLoaded', async () => {

    // Hora live
    const actualizarHora = () => {
        const el = document.getElementById('nav-hora');
        if (el) el.textContent = new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
    };
    actualizarHora();
    setInterval(actualizarHora, 60000);

    // Init mapa
    initMapa();

    // Cargar todo en paralelo
    const [provincias, alertas] = await Promise.all([
        fetchTodasProvincias(),
        fetchAlertasCOE(),
    ]);

    // Guardar alertas globalmente para el toggle
    window.alertasCOE = alertas;

    // Mapa — GeoJSON coloreado + marcadores temperatura
    await cargarGeoJSON(alertas);
    actualizarMarcadores(provincias);

    // Render
    renderProvinciasGrid(provincias);
    renderStatsNacionales(provincias);
    renderAlertasCOE(alertas);

    // Nav clima default — Distrito Nacional
    const dn = provincias.find(p => p.nombre === 'Distrito Nacional') || provincias[0];
    if (dn) {
        document.getElementById('nav-temp').textContent = `${dn.temp}°C`;
        document.getElementById('nav-emoji').textContent = dn.emoji;
        mostrarClimaPanel(dn);
    }

    // Search
    document.getElementById('search-provincia')?.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        const encontrada = provincias.find(p => p.nombre.toLowerCase().includes(q));
        if (encontrada) mostrarClimaPanel(encontrada);
    });
});

// ── RENDER PROVINCIAS GRID ────────────────────────────────────
let datosCache = [];

function renderProvinciasGrid(provincias) {
    datosCache = provincias;
    const grid = document.getElementById('provincias-grid');
    if (!grid) return;

    grid.innerHTML = provincias.map((p, i) => `
    <div class="provincia-card" data-provincia="${p.nombre}"
      onclick="mostrarClimaPanel(datosCache.find(x => x.nombre === '${p.nombre}'))"
      style="animation-delay:${i * 0.03}s">
      <div class="flex items-center justify-between mb-2">
        <span class="font-mono text-[10px] text-[rgba(255,255,255,0.4)] truncate leading-tight"
          style="max-width:80px;">${p.nombre}</span>
        <span class="text-[16px] flex-shrink-0">${p.emoji}</span>
      </div>
      <div class="text-[1.8rem] font-extrabold text-white leading-none tracking-tight">${p.temp}°</div>
      <div class="flex items-center gap-2 mt-2">
        <span class="font-mono text-[10px] text-[rgba(255,255,255,0.4)]">💧${p.humedad}%</span>
        <span class="font-mono text-[10px] text-[rgba(255,255,255,0.4)]">💨${p.viento}</span>
      </div>
    </div>
  `).join('');
}

function ordenarPor(tipo) {
    document.querySelectorAll('.orden-btn').forEach(b => b.classList.remove('activo-orden'));
    document.getElementById(`btn-${tipo}`)?.classList.add('activo-orden');
    let ordenadas = [...datosCache];
    if (tipo === 'temp') ordenadas.sort((a, b) => b.temp - a.temp);
    if (tipo === 'nombre') ordenadas.sort((a, b) => a.nombre.localeCompare(b.nombre));
    renderProvinciasGrid(ordenadas);
}

// ── STATS NACIONALES ──────────────────────────────────────────
function renderStatsNacionales(provincias) {
    if (!provincias.length) return;
    const temps = provincias.map(p => p.temp);
    const promedio = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);
    const masCaliente = provincias.reduce((a, b) => a.temp > b.temp ? a : b);
    const masFresca = provincias.reduce((a, b) => a.temp < b.temp ? a : b);

    const e = id => document.getElementById(id);
    if (e('stat-temp-avg')) e('stat-temp-avg').textContent = `${promedio}°C`;
    if (e('stat-mas-caliente')) e('stat-mas-caliente').textContent = `${masCaliente.nombre} · ${masCaliente.temp}°C`;
    if (e('stat-mas-fresca')) e('stat-mas-fresca').textContent = `${masFresca.nombre} · ${masFresca.temp}°C`;
}

// ── PRONÓSTICO 7D ─────────────────────────────────────────────
function renderPronostico7D(provincia) {
    const grid = document.getElementById('pronostico-7d');
    if (!grid || !provincia?.pronostico?.length) return;

    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    grid.innerHTML = provincia.pronostico.map((d, i) => {
        const fecha = new Date(d.fecha);
        const diaStr = i === 0 ? 'Hoy' : dias[fecha.getDay()];
        return `
      <div class="dia-card ${i === 0 ? 'hoy' : ''}" style="animation-delay:${i * 0.06}s">
        <p class="font-mono text-[11px] text-[rgba(255,255,255,0.5)] mb-2 uppercase tracking-wide">${diaStr}</p>
        <div class="text-[2rem] mb-2">${d.emoji}</div>
        <p class="text-[16px] font-bold text-white">${d.max}°</p>
        <p class="text-[12px] text-[rgba(255,255,255,0.4)]">${d.min}°</p>
        ${d.lluvia > 0 ? `<p class="font-mono text-[10px] text-[#60a5fa] mt-2">🌧 ${d.lluvia}mm</p>` : ''}
      </div>
    `;
    }).join('');
}

// ── LEYENDA MAPA ──────────────────────────────────────────────
function renderLeyendaMapa() {
    const leyenda = document.getElementById('leyenda-mapa');
    if (!leyenda) return;
    leyenda.innerHTML = `
    <div class="flex items-center gap-1.5">
      <span class="w-3 h-3 rounded-sm inline-block" style="background:#16a34a"></span>
      <span class="font-mono text-[10px] text-[rgba(255,255,255,0.5)]">Normal</span>
    </div>
    <div class="flex items-center gap-1.5">
      <span class="w-3 h-3 rounded-sm inline-block" style="background:#eab308"></span>
      <span class="font-mono text-[10px] text-[rgba(255,255,255,0.5)]">Alerta</span>
    </div>
    <div class="flex items-center gap-1.5">
      <span class="w-3 h-3 rounded-sm inline-block" style="background:#e67e22"></span>
      <span class="font-mono text-[10px] text-[rgba(255,255,255,0.5)]">Naranja</span>
    </div>
    <div class="flex items-center gap-1.5">
      <span class="w-3 h-3 rounded-sm inline-block" style="background:#c0392b"></span>
      <span class="font-mono text-[10px] text-[rgba(255,255,255,0.5)]">Roja</span>
    </div>
  `;
}

// ── VIDEOS YOUTUBE ────────────────────────────────────────────
async function buscarVideosYouTube(provincia) {
    const grid = document.getElementById('videos-grid');
    if (!grid) return;

    grid.innerHTML = `
    <div class="skeleton h-48 rounded-2xl"></div>
    <div class="skeleton h-48 rounded-2xl"></div>
    <div class="skeleton h-48 rounded-2xl"></div>
  `;

    try {
        const query = encodeURIComponent(`inundaciones lluvias tormenta ${provincia} República Dominicana`);
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=6&order=date&relevanceLanguage=es&key=${CONFIG.YOUTUBE_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.items?.length) {
            grid.innerHTML = `<p class="col-span-3 text-center font-mono text-[12px] text-[rgba(255,255,255,0.3)] py-8">Sin videos recientes para ${provincia}</p>`;
            return;
        }

        grid.innerHTML = data.items.map((v, i) => `
      <div class="video-card rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.08)] cursor-pointer group"
        onclick="abrirVideo('${v.id.videoId}')"
        style="animation-delay:${i * 0.08}s">
        <div class="relative overflow-hidden" style="height:160px;">
          <img src="${v.snippet.thumbnails.medium.url}" alt="${v.snippet.title}"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
          <div class="absolute inset-0 bg-[rgba(0,0,0,0.3)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div class="w-12 h-12 rounded-full bg-[rgba(255,255,255,0.9)] flex items-center justify-center">
              <svg class="w-5 h-5 text-[#0a0f1e] ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
          <span class="absolute top-2 left-2 font-mono text-[10px] bg-[#c0392b] text-white px-2 py-1 rounded-full">EN VIVO · RD</span>
        </div>
        <div class="p-3">
          <h4 class="text-[13px] font-semibold text-white leading-snug line-clamp-2 mb-2">${v.snippet.title}</h4>
          <div class="flex items-center justify-between">
            <span class="font-mono text-[10px] text-[rgba(255,255,255,0.4)]">${v.snippet.channelTitle}</span>
            <span class="font-mono text-[10px] text-[rgba(255,255,255,0.3)]">${tiempoRelativoVideo(v.snippet.publishedAt)}</span>
          </div>
        </div>
      </div>
    `).join('');

    } catch (err) {
        grid.innerHTML = `<p class="col-span-3 text-center font-mono text-[12px] text-[rgba(255,255,255,0.3)] py-8">Error cargando videos</p>`;
    }
}

function abrirVideo(videoId) {
    const modal = document.getElementById('video-modal');
    const frame = document.getElementById('video-frame');
    if (modal && frame) {
        frame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function cerrarVideo() {
    const modal = document.getElementById('video-modal');
    const frame = document.getElementById('video-frame');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    if (frame) frame.src = '';
}

function tiempoRelativoVideo(fechaStr) {
    if (!fechaStr) return '';
    const diff = Math.floor((Date.now() - new Date(fechaStr)) / 1000);
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
    return `Hace ${Math.floor(diff / 86400)} días`;
}

function buscarYMostrar(nombre) {
    const provincia = datosCache.find(p => p.nombre === nombre);
    if (provincia) {
        mostrarClimaPanel(provincia);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}