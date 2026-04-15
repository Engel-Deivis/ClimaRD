const COE_RSS = 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.coe.gob.do%2Ffeed%2F&count=10';

async function fetchAlertasCOE() {
  return alertasSimuladas();
}

function detectarNivelAlerta(texto) {
    const t = texto.toLowerCase();
    if (t.match(/rojo|emergencia|catástrofe|crítico|evacuac/)) return 'roja';
    if (t.match(/naranja|alerta|severo|peligro|inundac/)) return 'naranja';
    if (t.match(/amarillo|precaución|aviso|vigilancia/)) return 'amarilla';
    return 'verde';
}

function limpiarHTML(texto) {
    if (!texto) return '';
    return texto.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function tiempoRelativoAlerta(fechaStr) {
    if (!fechaStr) return '';
    const diff = Math.floor((Date.now() - new Date(fechaStr)) / 1000);
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
    return `Hace ${Math.floor(diff / 86400)} días`;
}

function renderAlertasCOE(alertas) {
    const colores = {
        roja: { bg: 'alerta-roja', dot: '#c0392b', label: '🔴 Alerta Roja' },
        naranja: { bg: 'alerta-naranja', dot: '#f59e0b', label: '🟠 Alerta Naranja' },
        amarilla: { bg: 'alerta-amarilla', dot: '#eab308', label: '🟡 Alerta Amarilla' },
        verde: { bg: 'alerta-verde', dot: '#4ade80', label: '🟢 Informativo' },
    };

    // Full
    const full = document.getElementById('coe-alertas-full');
    if (full) {
        full.innerHTML = alertas.map((a, i) => {
            const c = colores[a.nivel];
            return `
        <a href="${a.url}" target="_blank" rel="noopener"
          class="alerta-card ${c.bg} block hover:opacity-90 transition-opacity"
          style="animation-delay:${i * 0.08}s">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1">
              <span class="font-mono text-[10px] tracking-widest font-bold block mb-2" style="color:${c.dot}">${c.label}</span>
              <h3 class="text-[14px] font-bold text-white leading-snug mb-1">${a.titulo}</h3>
              <p class="text-[12px] text-[rgba(255,255,255,0.5)] leading-relaxed">${a.desc}</p>
            </div>
            <span class="font-mono text-[11px] text-[rgba(255,255,255,0.3)] flex-shrink-0 mt-1">${a.tiempo}</span>
          </div>
        </a>
      `;
        }).join('');
    }

    // Mini panel
    const mini = document.getElementById('alertas-lista');
    if (mini) {
        const top2 = alertas.slice(0, 2);
        mini.innerHTML = top2.map(a => {
            const c = colores[a.nivel];
            return `
        <a href="${a.url}" target="_blank" rel="noopener"
          class="alerta-card ${c.bg} block p-3">
          <div class="flex items-center gap-2">
            <span style="width:8px;height:8px;border-radius:50%;background:${c.dot};flex-shrink:0;display:inline-block;"></span>
            <span class="text-[12px] font-semibold text-white leading-snug line-clamp-2">${a.titulo}</span>
          </div>
          <span class="font-mono text-[10px] text-[rgba(255,255,255,0.3)] mt-1 block">${a.tiempo}</span>
        </a>
      `;
        }).join('');
    }

    // Banner ticker
    if (alertas.length > 0) {
        const banner = document.getElementById('coe-banner');
        if (banner) banner.classList.remove('hidden');
        const ticker = document.getElementById('coe-ticker');
        if (ticker) ticker.textContent = alertas.map(a => `⚠️ ${a.titulo}`).join('   ·   ');
    }

    // Stat alertas
    const statAlerta = document.getElementById('stat-alertas');
    if (statAlerta) statAlerta.textContent = alertas.filter(a => a.nivel !== 'verde').length;
}

function alertasSimuladas() {
    return [
        { titulo: 'Vaguada mantiene condiciones de lluvia en varias provincias', desc: 'El COE mantiene en observación las provincias del norte y noreste del país ante las lluvias generadas por la vaguada.', url: 'https://www.coe.gob.do', fecha: new Date().toISOString(), tiempo: 'Hace 2h', nivel: 'amarilla' },
        { titulo: 'Crecidas de ríos en provincias del sur del país', desc: 'Se reportan crecidas en los ríos Ozama e Isabela. Se recomienda a la población alejarse de las márgenes.', url: 'https://www.coe.gob.do', fecha: new Date().toISOString(), tiempo: 'Hace 4h', nivel: 'naranja' },
        { titulo: 'Sistema mantiene vigilancia en toda la región del Caribe', desc: 'ONAMET mantiene en monitoreo constante el sistema de baja presión que se desplaza por el Atlántico.', url: 'https://www.coe.gob.do', fecha: new Date().toISOString(), tiempo: 'Hace 6h', nivel: 'verde' },
    ];
}