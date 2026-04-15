let mapaRD = null;
let marcadores = [];
let capaGeoJSON = null;
let provinciaActiva = null;
let datosProvincias = [];

// ── COLORES POR NIVEL ALERTA ──────────────────────────────────
const COLORES_ALERTA = {
    roja: { fill: '#c0392b', border: '#7f1d1d', label: '🔴 Alerta Roja' },
    naranja: { fill: '#e67e22', border: '#92400e', label: '🟠 Alerta Naranja' },
    amarilla: { fill: '#eab308', border: '#78350f', label: '🟡 Alerta Amarilla' },
    verde: { fill: '#16a34a', border: '#14532d', label: '🟢 Sin alerta' },
    normal: { fill: '#1e3a5f', border: '#1e40af', label: '⚪ Normal' },
};

// ── INIT MAPA ─────────────────────────────────────────────────
function initMapa() {
    mapaRD = L.map('mapa-rd', {
        center: [18.7357, -70.1627],
        zoom: 8,
        zoomControl: true,
        attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
    }).addTo(mapaRD);

    L.control.attribution({ prefix: '© OpenStreetMap · CartoDB' }).addTo(mapaRD);
}

// ── CARGAR GEOJSON Y COLOREAR ─────────────────────────────────
async function cargarGeoJSON(alertas = []) {
    try {
        const res = await fetch('assets/js/provincias.geojson');
        const data = await res.json();

        if (capaGeoJSON) mapaRD.removeLayer(capaGeoJSON);

        capaGeoJSON = L.geoJSON(data, {
            style: feature => {
                const nombre = feature.properties.name || feature.properties.NAME || '';
                const alerta = detectarAlertaProvincia(nombre, alertas);
                const color = COLORES_ALERTA[alerta] || COLORES_ALERTA.normal;
                return {
                    fillColor: color.fill,
                    fillOpacity: 0.45,
                    color: color.border,
                    weight: 1.5,
                    opacity: 0.8,
                };
            },
            onEachFeature: (feature, layer) => {
                const nombre = feature.properties.name || feature.properties.NAME || '';
                const alerta = detectarAlertaProvincia(nombre, alertas);
                const color = COLORES_ALERTA[alerta];

                layer.bindTooltip(`
          <div style="font-family:Inter,sans-serif;">
            <strong style="font-size:13px;">${nombre}</strong><br>
            <span style="font-size:12px;">${color.label}</span>
          </div>
        `, { sticky: true, className: 'tooltip-clima' });

                layer.on('click', () => {
                    const provincia = datosProvincias.find(p =>
                        p.nombre.toLowerCase().includes(nombre.toLowerCase()) ||
                        nombre.toLowerCase().includes(p.nombre.toLowerCase().split(' ')[0])
                    );
                    if (provincia) mostrarClimaPanel(provincia);
                });

                layer.on('mouseover', () => {
                    layer.setStyle({ fillOpacity: 0.7, weight: 2.5 });
                });

                layer.on('mouseout', () => {
                    layer.setStyle({ fillOpacity: 0.45, weight: 1.5 });
                });
            }
        }).addTo(mapaRD);

    } catch (err) {
        console.warn('GeoJSON no disponible, usando marcadores:', err.message);
    }
}

// ── DETECTAR ALERTA POR PROVINCIA ────────────────────────────
function detectarAlertaProvincia(nombreProvincia, alertas) {
    if (!alertas.length) return 'normal';
    const n = nombreProvincia.toLowerCase();

    for (const alerta of alertas) {
        const texto = (alerta.titulo + ' ' + alerta.desc).toLowerCase();
        if (texto.includes(n) || texto.includes(n.split(' ')[0])) {
            return alerta.nivel;
        }
    }
    return 'normal';
}

// ── ACTUALIZAR MARCADORES TEMPERATURA ────────────────────────
function actualizarMarcadores(provincias) {
    datosProvincias = provincias;

    marcadores.forEach(m => mapaRD.removeLayer(m));
    marcadores = [];

    provincias.forEach(p => {
        const color = tempAColor(p.temp);

        const icono = L.divIcon({
            html: `
        <div style="
          background: ${color};
          border: 2px solid rgba(255,255,255,0.9);
          border-radius: 50%;
          width: 40px; height: 40px;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          box-shadow: 0 3px 10px rgba(0,0,0,0.5);
          cursor: pointer;
        ">
          <span style="font-size:11px;font-weight:800;color:white;line-height:1;">${p.temp}°</span>
          <span style="font-size:10px;line-height:1;">${p.emoji}</span>
        </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            className: '',
        });

        const marcador = L.marker([p.lat, p.lng], { icon: icono }).addTo(mapaRD);

        marcador.bindTooltip(`
      <div style="font-family:Inter,sans-serif;min-width:150px;">
        <strong style="font-size:13px;">${p.nombre}</strong><br>
        <span style="font-size:12px;">${p.emoji} ${p.temp}°C · ${p.desc}</span><br>
        <span style="font-size:11px;color:#94a3b8;">💧${p.humedad}% · 💨${p.viento}km/h</span>
      </div>
    `, { direction: 'top', className: 'tooltip-clima' });

        marcador.on('click', () => mostrarClimaPanel(p));
        marcadores.push(marcador);
    });
}

// ── TEMP A COLOR ──────────────────────────────────────────────
function tempAColor(temp) {
    if (temp >= 38) return '#7f1d1d';
    if (temp >= 35) return '#c0392b';
    if (temp >= 32) return '#e67e22';
    if (temp >= 28) return '#f59e0b';
    if (temp >= 24) return '#16a34a';
    if (temp >= 20) return '#2563eb';
    return '#1e40af';
}

// ── TOGGLE VISTA ──────────────────────────────────────────────
let vistaActual = 'clima';

function toggleVistaMapa(vista) {
    vistaActual = vista;

    document.querySelectorAll('.toggle-mapa').forEach(b => b.classList.remove('activo-toggle'));
    document.getElementById(`toggle-${vista}`)?.classList.add('activo-toggle');

    if (vista === 'clima') {
        marcadores.forEach(m => m.addTo(mapaRD));
        if (capaGeoJSON) capaGeoJSON.setStyle(f => {
            const nombre = f.properties.name || '';
            return { fillOpacity: 0.2, weight: 1 };
        });
    } else {
        marcadores.forEach(m => mapaRD.removeLayer(m));
        if (capaGeoJSON) capaGeoJSON.setStyle(f => {
            const nombre = f.properties.name || f.properties.NAME || '';
            const alerta = detectarAlertaProvincia(nombre, window.alertasCOE || []);
            const color = COLORES_ALERTA[alerta] || COLORES_ALERTA.normal;
            return { fillColor: color.fill, fillOpacity: 0.6, color: color.border, weight: 2 };
        });
    }
}

// ── MOSTRAR CLIMA PANEL ───────────────────────────────────────
function mostrarClimaPanel(provincia) {
    provinciaActiva = provincia;

    document.getElementById('panel-placeholder')?.classList.add('hidden');
    const info = document.getElementById('panel-info');
    if (!info) return;
    info.classList.remove('hidden');
    info.style.display = 'flex';
    info.style.flexDirection = 'column';

    document.getElementById('info-provincia').textContent = provincia.nombre;
    document.getElementById('info-condicion').textContent = provincia.desc;
    document.getElementById('info-emoji').textContent = provincia.emoji;
    document.getElementById('info-temp').textContent = `${provincia.temp}°`;
    document.getElementById('info-sensacion').textContent = `${provincia.sensacion}°C`;
    document.getElementById('info-humedad').textContent = `${provincia.humedad}%`;
    document.getElementById('info-viento').textContent = `${provincia.viento} km/h`;
    document.getElementById('info-lluvia').textContent = `${provincia.lluvia}%`;
    document.getElementById('info-uv').textContent = `${provincia.uv}`;

    // Mini pronóstico
    const mini = document.getElementById('mini-pronostico');
    if (mini && provincia.pronostico?.length) {
        mini.innerHTML = provincia.pronostico.slice(0, 3).map(d => {
            const dia = new Date(d.fecha).toLocaleDateString('es-DO', { weekday: 'short' });
            return `
        <div class="flex-1 text-center bg-[rgba(255,255,255,0.05)] rounded-xl p-2">
          <p class="font-mono text-[10px] text-[rgba(255,255,255,0.4)] uppercase">${dia}</p>
          <p class="text-[18px] my-1">${d.emoji}</p>
          <p class="text-[12px] font-bold text-white">${d.max}°</p>
          <p class="text-[11px] text-[rgba(255,255,255,0.4)]">${d.min}°</p>
        </div>
      `;
        }).join('');
    }

    renderPronostico7D(provincia);
    buscarVideosYouTube(provincia.nombre);

    const label = document.getElementById('pronostico-provincia-label');
    if (label) label.textContent = provincia.nombre;

    document.querySelectorAll('.provincia-card').forEach(c => c.classList.remove('activa'));
    document.querySelector(`[data-provincia="${provincia.nombre}"]`)?.classList.add('activa');

    mapaRD.setView([provincia.lat, provincia.lng], 10, { animate: true });
}