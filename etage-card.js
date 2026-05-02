/* ═══════════════════════════════════════════
   ÉTAGE CARD — HACS Custom Card v4.0.0
   Réécriture complète propre
═══════════════════════════════════════════ */

/* ─── ÉDITEUR ─────────────────────────────── */
class EtageCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass   = null;
    this._tab    = 0;
    this.attachShadow({ mode: 'open' });
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) this._render();
  }

  setConfig(config) {
    const s = JSON.stringify(this._clean(config));
    if (s === JSON.stringify(this._clean(this._config))) return;
    this._config = this._clean(config);
    this._render();
  }

  _clean(cfg) {
    const keys    = ['temperatures','fenetres','prises','interrupteurs','volets','fumee'];
    const subkeys = ['_names','_hum','_bat'];
    const out     = JSON.parse(JSON.stringify(cfg || {}));
    keys.forEach(k => {
      if (!Array.isArray(out[k])) out[k] = [];
      subkeys.forEach(s => {
        if (!Array.isArray(out[k+s])) out[k+s] = [];
        for (let i = 0; i < out[k+s].length; i++) {
          if (!out[k+s][i]) out[k+s][i] = '';
        }
      });
    });
    return out;
  }

  _dispatch() {
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._clean(this._config) },
      bubbles: true, composed: true,
    }));
  }

  _sections() {
    return [
      { key:'temperatures',  label:'Températures',  icon:'🌡️', count:6,  extras:['hum','bat'] },
      { key:'fenetres',      label:'Fenêtres',      icon:'🪟', count:6,  extras:['bat']       },
      { key:'prises',        label:'Prises',        icon:'🔌', count:12, extras:[]            },
      { key:'interrupteurs', label:'Lumières',      icon:'💡', count:7,  extras:[]            },
      { key:'volets',        label:'Volets',        icon:'🏠', count:6,  extras:[]            },
      { key:'fumee',         label:'Sécurité',      icon:'🔥', count:1,  extras:['hum','bat'] },
    ];
  }

  _render() {
    const secs    = this._sections();
    const sec     = secs[this._tab];
    const vals    = this._config[sec.key]             || [];
    const names   = this._config[sec.key + '_names']  || [];
    const allE    = this._hass ? Object.keys(this._hass.states).sort() : [];

    const tabsHTML = secs.map((s, i) => {
      const active = i === this._tab ? 'active' : '';
      return `<button class="etab ${active}" data-i="${i}"><span>${s.icon}</span><span class="elbl">${s.label}</span></button>`;
    }).join('');

    const rowsHTML = Array.from({length: sec.count}, (_, i) => {
      const curVal  = vals[i] || '';
      const curName = (names[i] || '').replace(/"/g, '&quot;');
      const curHum  = (this._config[sec.key+'_hum'] || [])[i] || '';
      const curBat  = (this._config[sec.key+'_bat'] || [])[i] || '';

      const makeCombo = (k, v, ph, uid) => `
        <div class="combo" id="combo-${uid}">
          <div class="cdisplay">
            <input class="csearch" type="text" placeholder="${ph}"
              autocomplete="off" spellcheck="false"
              value="${v}" data-k="${k}" data-i="${i}" />
            <button class="cclr" data-k="${k}" data-i="${i}">✕</button>
          </div>
          <div class="cdrop" data-i="${i}" data-k="${k}"></div>
        </div>`;

      const extrasHTML = (sec.extras || []).map(ext => {
        if (ext === 'hum') return `<div class="extrow">
          <span class="extlbl">💧 Humid.</span>
          ${makeCombo(sec.key+'_hum', curHum, '🔍 Capteur humidité…', sec.key+'hum'+i)}
        </div>`;
        if (ext === 'bat') return `<div class="extrow">
          <span class="extlbl">🔋 Bat.</span>
          ${makeCombo(sec.key+'_bat', curBat, '🔍 Capteur batterie…', sec.key+'bat'+i)}
        </div>`;
        return '';
      }).join('');

      return `
        <div class="erow">
          <span class="enum">${i+1}</span>
          <input class="ename" type="text" placeholder="Label…" value="${curName}"
            data-k="${sec.key}_names" data-i="${i}" />
          ${makeCombo(sec.key, curVal, '🔍 Rechercher sensor…', sec.key+'main'+i)}
        </div>
        ${extrasHTML}`;
    }).join('');

    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block;font-family:'Segoe UI',sans-serif}
        *{box-sizing:border-box;margin:0;padding:0}
        .wrap{background:#0b1120;border:1px solid #1e3a5f;border-radius:12px;overflow:hidden}
        /* tabs */
        .etabs{display:flex;overflow-x:auto;scrollbar-width:none;background:#060d1a;border-bottom:1px solid #1e3a5f}
        .etabs::-webkit-scrollbar{display:none}
        .etab{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px 7px;
          background:none;border:none;border-bottom:2px solid transparent;color:#475569;cursor:pointer;
          font-size:8px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;transition:.18s}
        .etab:hover{color:#94a3b8;background:#0f172a44}
        .etab.active{color:#38bdf8;border-bottom-color:#38bdf8;background:#0f172a}
        .etab span:first-child{font-size:16px;line-height:1}
        /* panel */
        .panel{padding:10px 12px 12px;max-height:390px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#334155 transparent}
        .panel::-webkit-scrollbar{width:5px}
        .panel::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}
        .ptitle{font-size:10px;color:#475569;text-transform:uppercase;letter-spacing:.08em;margin-bottom:9px}
        /* rows */
        .erow{display:grid;grid-template-columns:18px 120px 1fr;gap:7px;align-items:center;margin-bottom:6px}
        .enum{font-size:10px;color:#334155;font-weight:700;text-align:right}
        .ename,.csearch{width:100%;padding:5px 8px;background:#111827;border:1px solid #1f2f45;
          color:#e2e8f0;border-radius:7px;font-size:12px;outline:none;transition:border-color .15s,box-shadow .15s}
        .ename::placeholder,.csearch::placeholder{color:#334155}
        .ename:focus,.csearch:focus{border-color:#38bdf8;box-shadow:0 0 0 2px #38bdf822}
        /* combobox */
        .combo{position:relative;width:100%}
        .cdisplay{display:flex;align-items:center;background:#111827;border:1px solid #1f2f45;border-radius:7px;overflow:hidden;transition:border-color .15s,box-shadow .15s}
        .cdisplay:focus-within{border-color:#38bdf8;box-shadow:0 0 0 2px #38bdf822}
        .csearch{border:none;border-radius:0;flex:1}
        .cclr{padding:0 8px;background:none;border:none;color:#475569;cursor:pointer;font-size:11px;transition:color .15s}
        .cclr:hover{color:#f43f5e}
        .cdrop{display:none;position:absolute;top:calc(100% + 3px);left:0;right:0;z-index:9999;
          background:#111827;border:1px solid #38bdf8;border-radius:7px;max-height:180px;overflow-y:auto;
          scrollbar-width:thin;scrollbar-color:#334155 transparent;box-shadow:0 8px 24px #00000088}
        .cdrop::-webkit-scrollbar{width:4px}
        .cdrop::-webkit-scrollbar-thumb{background:#334155;border-radius:2px}
        .cdrop.open{display:block}
        .copt{padding:6px 10px;font-size:11px;color:#94a3b8;cursor:pointer;
          border-bottom:1px solid #1f2f4544;transition:background .1s,color .1s;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .copt:last-child{border-bottom:none}
        .copt:hover,.copt.sel{background:#1e3a5f;color:#e2e8f0}
        .copt.sel{color:#38bdf8}
        .cnone{padding:8px 10px;font-size:11px;color:#475569;font-style:italic}
        .extrow{display:grid;grid-template-columns:60px 1fr;gap:7px;align-items:center;
          margin-bottom:5px;margin-left:25px}
        .extlbl{font-size:10px;color:#475569;white-space:nowrap}
        .extrow{display:grid;grid-template-columns:60px 1fr;gap:7px;align-items:center;
          margin-bottom:5px;margin-left:25px}
        .extlbl{font-size:10px;color:#475569;white-space:nowrap}
        option{background:#111827;color:#e2e8f0}
      </style>
      <div class="wrap">
        <div class="etabs">${tabsHTML}</div>
        <div class="panel">
          <div class="ptitle">${sec.icon} ${sec.label} — ${sec.count} élément${sec.count>1?'s':''}</div>
          ${rowsHTML}
        </div>
      </div>`;

    /* ── Listeners ── */
    const host = this;
    const cfg  = this._config;

    // Onglets
    this.shadowRoot.querySelectorAll('.etab').forEach(btn => {
      btn.addEventListener('click', () => { this._tab = +btn.dataset.i; this._render(); });
    });

    // Labels : stockage silencieux + dispatch au blur
    this.shadowRoot.querySelectorAll('input.ename').forEach(inp => {
      inp.addEventListener('input', () => {
        const k = inp.dataset.k, i = +inp.dataset.i;
        if (!cfg[k]) cfg[k] = [];
        cfg[k][i] = inp.value;
      });
      inp.addEventListener('blur', () => this._dispatch());
    });

    // Combobox
    this.shadowRoot.querySelectorAll('.csearch').forEach(inp => {
      const i    = +inp.dataset.i;
      const k    = inp.dataset.k;
      const drop = this.shadowRoot.querySelector(`.cdrop[data-i="${i}"][data-k="${k}"]`);

      const fill = (q) => {
        q = q.toLowerCase();
        const cur = (cfg[k]||[])[i] || '';
        const list = allE.filter(e => !q || e.toLowerCase().includes(q)).slice(0, 100);
        drop.innerHTML = list.length
          ? list.map(e => `<div class="copt${e===cur?' sel':''}" data-v="${e}">${e}</div>`).join('')
          : `<div class="cnone">Aucun résultat</div>`;
        drop.classList.add('open');
      };

      inp.addEventListener('focus', () => fill(inp.value));
      inp.addEventListener('input', () => fill(inp.value));

      drop.addEventListener('mousedown', ev => {
        const opt = ev.target.closest('.copt');
        if (!opt) return;
        ev.preventDefault();
        inp.value = opt.dataset.v;
        if (!cfg[k]) cfg[k] = [];
        cfg[k][i] = opt.dataset.v;
        drop.classList.remove('open');
        host._dispatch();
      });

      inp.addEventListener('blur', () => {
        setTimeout(() => drop.classList.remove('open'), 150);
        if (!cfg[k]) cfg[k] = [];
        if (cfg[k][i] !== inp.value) {
          cfg[k][i] = inp.value;
          host._dispatch();
        }
      });
    });

    // Bouton effacer
    this.shadowRoot.querySelectorAll('.cclr').forEach(btn => {
      btn.addEventListener('click', () => {
        const k = btn.dataset.k, i = +btn.dataset.i;
        const inp = this.shadowRoot.querySelector(`.csearch[data-k="${k}"][data-i="${i}"]`);
        if (inp) inp.value = '';
        if (!cfg[k]) cfg[k] = [];
        cfg[k][i] = '';
        this._dispatch();
      });
    });
  }
}
customElements.define('etage-card-editor', EtageCardEditor);


/* ─── CARTE PRINCIPALE ────────────────────── */
class EtageCard extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass   = null;
    this._tab    = 0;
    this.attachShadow({ mode: 'open' });
    this._history = {};   // cache historique par entité
    this._tabs = [
      { key:'temperatures',  label:'Températures', icon:'🌡️', color:'#f97316' },
      { key:'fenetres',      label:'Fenêtres',     icon:'🪟', color:'#38bdf8' },
      { key:'prises',        label:'Prises',       icon:'🔌', color:'#a78bfa' },
      { key:'interrupteurs', label:'Lumières',     icon:'💡', color:'#fbbf24' },
      { key:'volets',        label:'Volets',       icon:'🏠', color:'#34d399' },
      { key:'fumee',         label:'Sécurité',     icon:'🔥', color:'#f43f5e' },
    ];
  }

  setConfig(config) { this._config = config || {}; this._render(); }
  set hass(h) {
    const wasNull = !this._hass;
    this._hass = h;
    this._render();
    if (wasNull) this._loadHistory();
  }
  getCardSize()     { return 5; }

  static getConfigElement() { return document.createElement('etage-card-editor'); }
  static getStubConfig()    { return {}; }

  /* ── helpers ── */
  _st(e)     { return (e && this._hass) ? (this._hass.states[e] || null) : null; }
  _attr(e,a) { const s=this._st(e); return s ? (s.attributes?.[a] ?? null) : null; }
  _on(e)     { const s=this._st(e); return s ? ['on','open','true','locked'].includes(s.state) : false; }

  /* ── Chargement historique ── */
  _loadHistory() {
    const ents = (this._config.temperatures || []).filter(e => e);
    if (!ents.length || !this._hass) return;
    const end   = new Date();
    const start = new Date(end - 8 * 3600 * 1000); // 8 heures
    const ids   = ents.join(',');
    const url   = `history/period/${start.toISOString()}?filter_entity_id=${ids}&minimal_response=true&no_attributes=true`;
    this._hass.callApi('GET', url).then(data => {
      if (!Array.isArray(data)) return;
      data.forEach(series => {
        if (!series.length) return;
        const eid = series[0].entity_id || ents[0];
        // Découper en 8 tranches d'une heure et faire la moyenne
        const buckets = Array.from({length:8}, (_,i) => {
          const t0 = start.getTime() + i * 3600000;
          const t1 = t0 + 3600000;
          const vals = series
            .filter(p => { const t=new Date(p.last_changed||p.lu).getTime(); return t>=t0 && t<t1; })
            .map(p => parseFloat(p.state))
            .filter(v => !isNaN(v));
          return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
        });
        this._history[eid] = buckets;
      });
      this._render();
    }).catch(() => {});
  }

  /* ── Thermomètre SVG vertical ── */
  _thermometer(val, col) {
    const pct  = isNaN(val) ? 0 : Math.min(100, Math.max(0, ((val-10)/30)*100));
    const tubeH = 44;
    const fillH = Math.round((pct/100) * tubeH);
    const fillY = 6 + (tubeH - fillH);
    return `<svg viewBox="0 0 22 72" width="22" height="72">
      <defs>
        <linearGradient id="thfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${col}" stop-opacity=".9"/>
          <stop offset="100%" stop-color="${col}"/>
        </linearGradient>
        <clipPath id="thclip">
          <rect x="5" y="6" width="12" height="${tubeH}" rx="5"/>
        </clipPath>
      </defs>
      <!-- tube fond -->
      <rect x="5" y="6" width="12" height="${tubeH}" rx="5" fill="#0f172a" stroke="#1e3a5f" stroke-width="1.2"/>
      <!-- remplissage -->
      <rect x="5" y="${fillY}" width="12" height="${fillH}" rx="5" fill="url(#thfill)" clip-path="url(#thclip)"
        style="filter:drop-shadow(0 0 3px ${col}99)"/>
      <!-- bulbe -->
      <circle cx="11" cy="57" r="9" fill="${col}" style="filter:drop-shadow(0 0 5px ${col}88)"/>
      <circle cx="11" cy="57" r="5.5" fill="${col}" opacity=".6"/>
      <!-- graduation -->
      <line x1="17" y1="17" x2="19" y2="17" stroke="#334155" stroke-width="1"/>
      <line x1="17" y1="28" x2="19" y2="28" stroke="#334155" stroke-width="1"/>
      <line x1="17" y1="39" x2="19" y2="39" stroke="#334155" stroke-width="1"/>
      <line x1="17" y1="50" x2="19" y2="50" stroke="#334155" stroke-width="1"/>
    </svg>`;
  }

  /* ── Mini graphique en barres ── */
  _miniBars(eid, col) {
    const data = this._history[eid];
    if (!data || !data.some(v=>v!==null)) return '';
    const vals   = data.map(v => v ?? 0);
    const minV   = Math.min(...vals.filter(v=>v>0));
    const maxV   = Math.max(...vals);
    const range  = maxV - minV || 1;
    const W = 8, G = 2, H = 24;
    const bars = vals.map((v, i) => {
      if (v === 0 && data[i] === null) {
        return `<rect x="${i*(W+G)}" y="0" width="${W}" height="${H}" rx="2" fill="#1e3a5f" opacity=".4"/>`;
      }
      const h   = Math.max(4, Math.round(((v - minV) / range) * H));
      const bCol = this._tempColor(v);
      const now  = i === vals.length - 1;
      return `<rect x="${i*(W+G)}" y="${H-h}" width="${W}" height="${h}" rx="2"
        fill="${bCol}" opacity="${now?'1':'0.55'}"
        ${now?`style="filter:drop-shadow(0 0 3px ${bCol}88)"`:''}/>`;
    }).join('');
    const labelW = (W+G)*8 - G;
    return `<div class="mbars-wrap">
      <svg viewBox="0 ${0} ${labelW} ${H}" width="100%" height="${H}" style="overflow:visible">
        ${bars}
      </svg>
      <div class="mbars-legend"><span>-8h</span><span>maintenant</span></div>
    </div>`;
  }

  _tempColor(v) {
    if (v < 15) return '#60a5fa';
    if (v < 20) return '#34d399';
    if (v < 25) return '#fbbf24';
    if (v < 28) return '#f97316';
    return '#f43f5e';
  }

  /* ── Extra pills : humidité + batterie ── */
  _extra(mainE, humE, batE) {
    let html = '';
    // Humidité : attribut OU entité dédiée
    const humAttr = this._attr(mainE, 'humidity');
    const humVal  = humAttr !== null ? humAttr
                  : humE ? (this._st(humE) ? parseFloat(this._st(humE).state) : null) : null;
    if (humVal !== null && !isNaN(humVal)) {
      const h = parseFloat(humVal);
      const c = h<40?'#60a5fa':h<60?'#34d399':h<75?'#fbbf24':'#f43f5e';
      html += `<span class="xpill"><span>💧</span><b style="color:${c}">${h.toFixed(0)}%</b></span>`;
    }
    // Batterie : attribut OU entité dédiée
    const a = (mainE && this._hass && this._hass.states[mainE]) ? (this._hass.states[mainE].attributes||{}) : {};
    const batAttr = a.battery ?? a.battery_level ?? a.battery_percent ?? null;
    const batVal  = batAttr !== null ? batAttr
                  : batE ? (this._st(batE) ? parseFloat(this._st(batE).state) : null) : null;
    if (batVal !== null && !isNaN(batVal)) {
      const b = parseFloat(batVal);
      const c = b>60?'#34d399':b>30?'#fbbf24':'#f43f5e';
      const ico = b>60?'🔋':b>30?'🪫':'⚠️';
      html += `<span class="xpill"><span>${ico}</span><b style="color:${c}">${b.toFixed(0)}%</b></span>`;
    }
    return html ? `<div class="xrow">${html}</div>` : '';
  }

  /* ── Status bar chips ── */
  _statusBar() {
    const cfg = this._config;
    const tot = k => (cfg[k]||[]).filter(e=>e).length;
    const on  = k => (cfg[k]||[]).filter(e=>e&&this._on(e)).length;
    const volOpen = (cfg.volets||[]).filter(e=>{ const s=this._st(e); return s&&s.state==='open'; }).length;

    const chip = (ico, val, total, col, label) => {
      const active = val > 0;
      const c = active ? col : '#334155';
      return `<div class="schip" style="border-color:${c}33;color:${c}">
        <span>${ico}</span>
        <b>${val}</b><span class="stot">/${total}</span>
        <span class="slbl">${label}</span>
      </div>`;
    };

    const fumOn = (cfg.fumee||[]).filter(e=>e&&this._on(e)).length;
    const fumChip = fumOn
      ? `<div class="schip salarm"><span>🔥</span><b>ALERTE</b></div>`
      : `<div class="schip" style="border-color:#34d39933;color:#34d399"><span>🔥</span><b style="font-size:9px">OK</b></div>`;

    return `<div class="sbar">
      ${chip('💡', on('interrupteurs'), tot('interrupteurs'), '#fbbf24', on('interrupteurs')===1?'allumée':'allumées')}
      ${chip('🪟', on('fenetres'),      tot('fenetres'),      '#38bdf8', on('fenetres')===1?'ouverte':'ouvertes')}
      ${chip('🔌', on('prises'),        tot('prises'),        '#a78bfa', on('prises')===1?'active':'actives')}
      ${chip('🏠', volOpen,             tot('volets'),        '#34d399', volOpen===1?'ouvert':'ouverts')}
      ${fumChip}
    </div>`;
  }

  /* ── Panels ── */
  _panelTemperatures() {
    const ents  = (this._config.temperatures       || []);
    const names = (this._config.temperatures_names || []);
    const items = ents.map((e,i) => {
      if (!e) return '';
      const s   = this._st(e);
      const val = s ? parseFloat(s.state) : NaN;
      const unit= this._attr(e,'unit_of_measurement') || '°C';
      const col = isNaN(val) ? '#38bdf8' : this._tempColor(val);
      const nm  = names[i] || e.split('.')[1].replace(/_/g,' ');
      const humE= (this._config.temperatures_hum||[])[i]||'';
      const batE= (this._config.temperatures_bat||[])[i]||'';
      const xtr = this._extra(e,humE,batE);
      const thermo = this._thermometer(val, col);
      const bars   = this._miniBars(e, col);
      return `<div class="tcard" style="--col:${col}">
        <div class="tcard-bg"></div>
        <div class="tcard-thermo">${thermo}</div>
        <div class="tcard-body">
          <div class="tname">${nm}</div>
          <div class="tval" style="color:${col}">${isNaN(val)?'—':val.toFixed(1)}<span class="tunit">${unit}</span></div>
          ${xtr}
          ${bars}
        </div>
      </div>`;
    }).filter(Boolean).join('');
    if (!items) return '<div class="empty">Aucun capteur configuré</div>';
    return `<div class="g2 gfill">${items}</div>`;
  }

  _panelFenetres() {
    const ents  = (this._config.fenetres       || []);
    const names = (this._config.fenetres_names || []);
    const items = ents.map((e,i) => {
      if (!e) return '';
      const open = this._on(e);
      const nm   = names[i] || e.split('.')[1].replace(/_/g,' ');
      const batE = (this._config.fenetres_bat||[])[i]||'';
      const xtr  = this._extra(e,'',batE);
      return `<div class="wcard ${open?'wopen':'wclose'}">
        <div class="wwin">${open ? this._bigWinOpen() : this._bigWinClosed()}</div>
        <div class="wfoot">
          <div class="wname">${nm}</div>
          <div class="wst ${open?'won':'woff'}">${open?'Ouverte':'Fermée'}</div>
          ${xtr}
        </div>
      </div>`;
    }).filter(Boolean).join('');
    if (!items) return '<div class="empty">Aucune fenêtre configurée</div>';
    return `<div class="g3 gfill">${items}</div>`;
  }

  _panelPrises() {
    const ents  = (this._config.prises       || []);
    const names = (this._config.prises_names || []);
    const items = ents.map((e,i) => {
      if (!e) return '';
      const on  = this._on(e);
      const pw  = this._attr(e,'current_power_w') ?? this._attr(e,'power') ?? null;
      const nm  = names[i] || e.split('.')[1].replace(/_/g,' ');
      return `<div class="pcard ${on?'pon':''}" onclick="this.getRootNode().host._toggle('${e}')">
        <div class="pring">${this._plugRing(on)}</div>
        <div class="pname">${nm}</div>
        ${pw!==null?`<div class="ppow">${parseFloat(pw).toFixed(0)}<span style="font-size:7px">W</span></div>`:''}
        <div class="ppill ${on?'ppillon':'ppilloff'}">${on?'ON':'OFF'}</div>
      </div>`;
    }).filter(Boolean).join('');
    if (!items) return '<div class="empty">Aucune prise configurée</div>';
    return `<div class="g4 gfill">${items}</div>`;
  }

  _panelInterrupteurs() {
    const ents  = (this._config.interrupteurs       || []);
    const names = (this._config.interrupteurs_names || []);
    const items = ents.map((e,i) => {
      if (!e) return '';
      const on = this._on(e);
      const nm = names[i] || e.split('.')[1].replace(/_/g,' ');
      return `<div class="swcard ${on?'swon':''}" onclick="this.getRootNode().host._toggle('${e}')">
        <div class="swglow ${on?'sgon':''}"></div>
        <div class="swico">${this._bigBulb(on)}</div>
        <div class="swinfo">
          <div class="swname">${nm}</div>
          <div class="swst">${on?'Allumée':'Éteinte'}</div>
        </div>
        <div class="swtog ${on?'togon':'togoff'}"><div class="togthumb"></div></div>
      </div>`;
    }).filter(Boolean).join('');
    if (!items) return '<div class="empty">Aucun interrupteur configuré</div>';
    return `<div class="gsw gfill">${items}</div>`;
  }

  _panelVolets() {
    const ents  = (this._config.volets       || []);
    const names = (this._config.volets_names || []);
    const items = ents.map((e,i) => {
      if (!e) return '';
      const pos = this._attr(e,'current_position') ?? 50;
      const pct = Math.round(pos);
      const nm  = names[i] || e.split('.')[1].replace(/_/g,' ');
      return `<div class="vcard">
        <div class="vhdr"><span class="vname">${nm}</span><span class="vpct">${pct}%</span></div>
        <div class="vwin">${this._winScene(pct)}</div>
        <input type="range" class="vslider" min="0" max="100" value="${pct}"
          onchange="this.getRootNode().host._setPos('${e}',+this.value)"
          oninput="this.getRootNode().host._setPos('${e}',+this.value)" />
        <div class="vbtns">
          <button class="vb" onclick="this.getRootNode().host._cover('${e}','open_cover')">▲</button>
          <button class="vb vbstop" onclick="this.getRootNode().host._cover('${e}','stop_cover')">■</button>
          <button class="vb" onclick="this.getRootNode().host._cover('${e}','close_cover')">▼</button>
        </div>
      </div>`;
    }).filter(Boolean).join('');
    if (!items) return '<div class="empty">Aucun volet configuré</div>';
    return `<div class="gv gfill">${items}</div>`;
  }

  _panelFumee() {
    const ents  = (this._config.fumee       || []);
    const names = (this._config.fumee_names || []);
    const e     = ents[0] || '';
    if (!e) return '<div class="empty">Aucun détecteur configuré</div>';
    const on   = this._on(e);
    const s    = this._st(e);
    const nm   = names[0] || e.split('.')[1].replace(/_/g,' ');
    const last = s?.last_changed ? new Date(s.last_changed).toLocaleString('fr-FR') : '—';
    const humE = (this._config.fumee_hum||[])[0]||'';
    const batE = (this._config.fumee_bat||[])[0]||'';
    const xtr  = this._extra(e,humE,batE);
    return `<div class="fsection">
      <div class="fbg">${this._fumeeScene(on)}</div>
      <div class="foverlay">
        <div class="fring ${on?'falarm':'fok'}">
          <div class="frings2 ${on?'falarm2':'fok2'}"></div>
          <div class="frings3 ${on?'falarm3':'fok3'}"></div>
          ${on ? this._icoSmoke() : this._icoCheck()}
        </div>
        <div class="fname">${nm}</div>
        <div class="fstatus ${on?'falarmtxt':'foktxt'}">${on?'🚨 ALARME DÉTECTÉE !':'✅ Tout est normal'}</div>
        ${xtr}
        <div class="fmeta">Dernier changement : ${last}</div>
      </div>
    </div>`;
  }

  /* ── SVG riches ── */
  _bigWinOpen() {
    return `<svg viewBox="0 0 80 90" width="100%" height="100%">
      <defs>
        <radialGradient id="sky" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stop-color="#0ea5e9" stop-opacity=".25"/>
          <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="80" height="90" fill="url(#sky)"/>
      <rect x="4" y="6" width="72" height="78" rx="4" stroke="#38bdf8" stroke-width="2" fill="#0ea5e911"/>
      <line x1="40" y1="6" x2="40" y2="84" stroke="#38bdf8" stroke-width="1.5" opacity=".6"/>
      <line x1="4" y1="45" x2="76" y2="45" stroke="#38bdf8" stroke-width="1.5" opacity=".6"/>
      <circle cx="40" cy="45" r="4" fill="#38bdf8" opacity=".5"/>
      <line x1="40" y1="2" x2="40" y2="0" stroke="#fbbf24" stroke-width="3" stroke-linecap="round" opacity=".6"/>
      <line x1="55" y1="10" x2="57" y2="8" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" opacity=".5"/>
      <line x1="25" y1="10" x2="23" y2="8" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" opacity=".5"/>
      <circle cx="63" cy="18" r="6" fill="#fbbf24" opacity=".15"/>
    </svg>`;
  }

  _bigWinClosed() {
    return `<svg viewBox="0 0 80 90" width="100%" height="100%">
      <rect x="4" y="6" width="72" height="78" rx="4" stroke="#334155" stroke-width="2" fill="#0f172a88"/>
      <line x1="40" y1="6" x2="40" y2="84" stroke="#334155" stroke-width="1.5"/>
      <line x1="4" y1="45" x2="76" y2="45" stroke="#334155" stroke-width="1.5"/>
      <rect x="36" y="41" width="8" height="8" rx="2" fill="#334155"/>
      <circle cx="20" cy="25" r="2" fill="#475569" opacity=".4"/>
      <circle cx="20" cy="35" r="1.5" fill="#475569" opacity=".3"/>
      <circle cx="60" cy="30" r="2.5" fill="#475569" opacity=".3"/>
    </svg>`;
  }

  _bigBulb(on) {
    if (on) return `<svg viewBox="0 0 48 48" width="40" height="40" fill="none">
      <circle cx="24" cy="20" r="16" fill="#fbbf2408" stroke="none"/>
      <circle cx="24" cy="20" r="11" fill="#fbbf2415"/>
      <path d="M24 6C17 6 12 11 12 18c0 5 3 9.5 7.5 11.5V32c0 1.1.9 2 2 2h5c1.1 0 2-.9 2-2v-2.5C33 27.5 36 23 36 18c0-7-5-12-12-12z"
        stroke="#fbbf24" stroke-width="2" fill="#fbbf2422"/>
      <line x1="20.5" y1="34" x2="27.5" y2="34" stroke="#fbbf24" stroke-width="1.5"/>
      <line x1="24" y1="2" x2="24" y2="4" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
      <line x1="34" y1="8" x2="32.5" y2="9.5" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
      <line x1="14" y1="8" x2="15.5" y2="9.5" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
      <line x1="38" y1="18" x2="36" y2="18" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
      <line x1="10" y1="18" x2="12" y2="18" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
    return `<svg viewBox="0 0 48 48" width="40" height="40" fill="none">
      <path d="M24 6C17 6 12 11 12 18c0 5 3 9.5 7.5 11.5V32c0 1.1.9 2 2 2h5c1.1 0 2-.9 2-2v-2.5C33 27.5 36 23 36 18c0-7-5-12-12-12z"
        stroke="#334155" stroke-width="2" fill="#1e293b"/>
      <line x1="20.5" y1="34" x2="27.5" y2="34" stroke="#334155" stroke-width="1.5"/>
    </svg>`;
  }

  _plugRing(on) {
    const c = on ? '#a78bfa' : '#334155';
    const glow = on ? `filter:drop-shadow(0 0 6px #a78bfa88)` : '';
    return `<svg viewBox="0 0 52 52" width="48" height="48" style="${glow}">
      <circle cx="26" cy="26" r="22" fill="none" stroke="${on?'#a78bfa22':'#1e293b'}" stroke-width="4"/>
      <circle cx="26" cy="26" r="22" fill="none" stroke="${c}" stroke-width="3"
        stroke-dasharray="${on?'138 0':'40 98'}" stroke-linecap="round"
        style="transition:stroke-dasharray .5s"/>
      <rect x="16" y="8" width="20" height="22" rx="5" stroke="${c}" stroke-width="2" fill="${on?'#4c1d9520':'transparent'}"/>
      <line x1="20" y1="13" x2="20" y2="20" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
      <line x1="32" y1="13" x2="32" y2="20" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
      <line x1="26" y1="30" x2="26" y2="40" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="20" y1="40" x2="32" y2="40" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`;
  }

  _winScene(pct) {
    const skyBright = Math.round(pct * 2);
    const opacity   = (pct / 100).toFixed(2);
    const slats     = 5;
    const sh        = 5;
    const gap       = (pct / 100) * ((56 - slats*sh) / (slats-1));
    let shutterSVG  = '';
    for (let i=0; i<slats; i++) {
      const y = 2 + i*(sh+gap);
      shutterSVG += `<rect x="2" y="${y.toFixed(1)}" width="76" height="${sh}" rx="1.5" fill="#334155" opacity=".9"/>`;
    }
    return `<svg viewBox="0 0 80 64" width="100%" height="58">
      <defs>
        <linearGradient id="sky${pct}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0ea5e9" stop-opacity="${(pct*0.006).toFixed(2)}"/>
          <stop offset="100%" stop-color="#1e3a8a" stop-opacity="${(pct*0.004).toFixed(2)}"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="80" height="64" rx="4" fill="url(#sky${pct})"/>
      ${pct>40?`<circle cx="60" cy="14" r="${(pct*0.08).toFixed(1)}" fill="#fbbf24" opacity="${(pct/200).toFixed(2)}"/>`:''}
      ${pct>60?`<line x1="60" y1="2" x2="60" y2="6" stroke="#fbbf24" stroke-width="1.5" opacity=".4"/>
      <line x1="70" y1="8" x2="72" y2="6" stroke="#fbbf24" stroke-width="1.5" opacity=".4"/>`:''}
      <rect x="0" y="0" width="80" height="64" rx="4" fill="none" stroke="#1e3a5f" stroke-width="1"/>
      ${shutterSVG}
    </svg>`;
  }

  _fumeeScene(on) {
    if (on) return `<svg viewBox="0 0 300 200" width="100%" height="100%" style="opacity:.15">
      <circle cx="150" cy="100" r="80" fill="none" stroke="#f43f5e" stroke-width="2" opacity=".5"/>
      <circle cx="150" cy="100" r="110" fill="none" stroke="#f43f5e" stroke-width="1.5" opacity=".3"/>
      <circle cx="150" cy="100" r="140" fill="none" stroke="#f43f5e" stroke-width="1" opacity=".15"/>
    </svg>`;
    return `<svg viewBox="0 0 300 200" width="100%" height="100%" style="opacity:.08">
      ${Array.from({length:20},(_,i)=>{
        const x=Math.random()*300, y=Math.random()*200, r=Math.random()*2+1;
        return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="#34d399"/>`;
      }).join('')}
      <circle cx="150" cy="100" r="60" fill="none" stroke="#34d399" stroke-width="1" opacity=".4"/>
    </svg>`;
  }

  /* ── Actions ── */
  /* ── Actions ── */
  _toggle(e) {
    if (!e || !this._hass) return;
    const d = e.split('.')[0];
    this._hass.callService(d, this._on(e)?'turn_off':'turn_on', {entity_id:e});
  }
  _cover(e,cmd) {
    if (!e || !this._hass) return;
    this._hass.callService('cover', cmd, {entity_id:e});
  }
  _setPos(e, pos) {
    if (!e || !this._hass) return;
    this._hass.callService('cover','set_cover_position',{entity_id:e,position:pos});
  }

  /* ── SVG icons ── */
  _icoWinOpen() {
    return `<svg viewBox="0 0 40 40" width="36" height="36" fill="none">
      <rect x="2" y="4" width="36" height="33" rx="3" stroke="#38bdf8" stroke-width="2.5" fill="#0ea5e922"/>
      <line x1="20" y1="4" x2="20" y2="37" stroke="#38bdf8" stroke-width="1.5"/>
      <line x1="2" y1="20" x2="38" y2="20" stroke="#38bdf8" stroke-width="1.5"/>
      <circle cx="20" cy="20" r="3" fill="#38bdf8" opacity=".6"/>
    </svg>`;
  }
  _icoWinClosed() {
    return `<svg viewBox="0 0 40 40" width="36" height="36" fill="none">
      <rect x="2" y="4" width="36" height="33" rx="3" stroke="#475569" stroke-width="2.5" fill="#1e293b"/>
      <line x1="20" y1="4" x2="20" y2="37" stroke="#475569" stroke-width="1.5"/>
      <line x1="2" y1="20" x2="38" y2="20" stroke="#475569" stroke-width="1.5"/>
      <rect x="17" y="17" width="6" height="6" rx="1" fill="#475569"/>
    </svg>`;
  }
  _icoPlug(on) {
    const c = on?'#a78bfa':'#475569';
    return `<svg viewBox="0 0 32 32" width="26" height="26" fill="none">
      <rect x="8" y="2" width="16" height="18" rx="4" stroke="${c}" stroke-width="2" fill="${on?'#4c1d9511':'#0f172a'}"/>
      <line x1="12" y1="6" x2="12" y2="12" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
      <line x1="20" y1="6" x2="20" y2="12" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
      <line x1="16" y1="20" x2="16" y2="28" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="11" y1="28" x2="21" y2="28" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`;
  }
  _icoBulb(on) {
    const c = on?'#fbbf24':'#475569';
    return `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
      ${on?`<circle cx="16" cy="13" r="10" fill="#fbbf2411"/>`:''}
      <path d="M16 4 C10 4 6 8.5 6 14 C6 18 8.5 21.5 12 23.5 L12 26 C12 27.1 12.9 28 14 28 L18 28 C19.1 28 20 27.1 20 26 L20 23.5 C23.5 21.5 26 18 26 14 C26 8.5 22 4 16 4Z"
        stroke="${c}" stroke-width="1.8" fill="${on?'#fbbf2422':'transparent'}"/>
      <line x1="13" y1="28" x2="19" y2="28" stroke="${c}" stroke-width="1.5"/>
    </svg>`;
  }
  _icoSmoke() {
    return `<svg viewBox="0 0 60 60" width="56" height="56" fill="none">
      <path d="M30 10 Q25 18 30 22 Q35 26 30 34" stroke="#f43f5e" stroke-width="3" stroke-linecap="round"/>
      <path d="M20 16 Q15 24 20 28 Q25 32 20 40" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>
      <path d="M40 16 Q45 24 40 28 Q35 32 40 40" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>
    </svg>`;
  }
  _icoCheck() {
    return `<svg viewBox="0 0 60 60" width="56" height="56" fill="none">
      <path d="M15 30 L26 41 L45 20" stroke="#34d399" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }
  _shutterSVG(pct) {
    const slats = 5;
    const open  = pct / 100;
    const total = 34;
    const sh    = 4;
    const gap   = open * (total - slats * sh) / (slats - 1);
    let svg = `<svg viewBox="0 0 60 38" width="100%" height="34">`;
    for (let i = 0; i < slats; i++) {
      const y = 2 + i * (sh + gap);
      svg += `<rect x="2" y="${y.toFixed(1)}" width="56" height="${sh}" rx="1" fill="#334155"/>`;
    }
    svg += '</svg>';
    return svg;
  }

  /* ── Tabs ── */
  _renderTabs() {
    return this._tabs.map((t,i) => `
      <button class="tab ${this._tab===i?'active':''}" style="--tc:${t.color}"
        onclick="this.getRootNode().host._setTab(${i})">
        <span class="ticon">${t.icon}</span>
        <span class="tlabel">${t.label}</span>
      </button>`).join('');
  }
  _setTab(i) { this._tab = i; this._render(); if (i===0) this._loadHistory(); }

  /* ── CSS ── */
  _css() {
    return `<style>
      :host{display:block}
      *{box-sizing:border-box;margin:0;padding:0}

      .card{
        background:linear-gradient(145deg,#0f172a,#1e293b);
        border-radius:16px;overflow:hidden;height:500px;
        display:flex;flex-direction:column;
        font-family:'Segoe UI',system-ui,sans-serif;color:#e2e8f0;
        box-shadow:0 20px 60px #00000066;border:1px solid #1e3a5f44;
      }

      /* header */
      .hdr{display:flex;align-items:center;justify-content:space-between;
        padding:7px 14px;background:linear-gradient(90deg,#0f172a,#1e293b);
        border-bottom:1px solid #1e3a5f;flex-shrink:0}
      .htitle{font-size:13px;font-weight:700;letter-spacing:.08em;color:#f8fafc}
      .hsub{font-size:9px;color:#64748b;margin-top:1px}
      .hdot{width:7px;height:7px;border-radius:50%;background:#34d399;
        box-shadow:0 0 6px #34d399;animation:pulse 2s infinite}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

      /* status bar */
      .sbar{display:flex;gap:5px;padding:4px 10px;background:#060d1a;
        border-bottom:1px solid #1e3a5f;flex-shrink:0;overflow-x:auto;scrollbar-width:none}
      .sbar::-webkit-scrollbar{display:none}
      .schip{display:flex;align-items:center;gap:3px;padding:2px 8px 2px 6px;
        border:1px solid #1e3a5f;border-radius:99px;font-size:11px;
        font-weight:600;white-space:nowrap;flex-shrink:0}
      .schip span:first-child{font-size:12px}
      .schip b{font-size:12px;font-weight:700}
      .stot{font-size:9px;font-weight:400;opacity:.5}
      .slbl{font-size:9px;font-weight:400;opacity:.7}
      .salarm{border-color:#f43f5e55!important;color:#f43f5e!important;animation:blink .5s infinite}
      @keyframes blink{0%,100%{opacity:1}50%{opacity:.5}}

      /* tabs */
      .tabs{display:flex;gap:2px;padding:5px 8px 0;background:#0f172a;
        flex-shrink:0;overflow-x:auto;scrollbar-width:none}
      .tabs::-webkit-scrollbar{display:none}
      .tab{display:flex;flex-direction:column;align-items:center;gap:1px;
        padding:4px 7px 5px;background:#1e293b;border:1px solid #1e3a5f33;
        border-radius:7px 7px 0 0;cursor:pointer;font-size:9px;color:#64748b;
        font-weight:600;letter-spacing:.04em;text-transform:uppercase;
        transition:.2s;white-space:nowrap;min-width:46px;border-bottom:2px solid transparent}
      .tab:hover{background:#1e3a5f;color:#94a3b8}
      .tab.active{background:linear-gradient(180deg,#1e3a5f,#1e293b);
        color:var(--tc);border-bottom-color:var(--tc);text-shadow:0 0 8px var(--tc)}
      .ticon{font-size:15px;line-height:1}

      /* content - géré dans grilles ci-dessous */

      /* empty */
      .empty{height:100%;display:flex;align-items:center;justify-content:center;
        color:#334155;font-size:12px;font-style:italic}

      /* extra pills */
      .xrow{display:flex;gap:5px;margin-top:5px;flex-wrap:wrap}
      .xpill{display:inline-flex;align-items:center;gap:3px;background:#0f172a;
        border:1px solid #1e3a5f;border-radius:99px;padding:2px 7px 2px 5px;font-size:10px}
      .xpill b{font-weight:700}

      /* content full height */
      .content{flex:1;overflow:hidden;padding:9px;display:flex;flex-direction:column}

      /* grilles remplissant l'espace */
      .gfill{flex:1;height:100%}
      .g2{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;grid-auto-rows:1fr}
      .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;grid-auto-rows:1fr}
      .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;grid-auto-rows:1fr}
      .gsw{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;grid-auto-rows:1fr}
      .gv{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;grid-auto-rows:1fr}

      /* température */
      .tcard{position:relative;background:#1e293b;border:1px solid #1e3a5f33;border-radius:10px;
        padding:10px 10px 8px 10px;overflow:hidden;display:flex;align-items:stretch;gap:8px;
        transition:.3s;border-left:3px solid var(--col,#38bdf8)}
      .tcard:hover{transform:translateY(-1px);box-shadow:0 4px 20px var(--col,#38bdf8)22}
      .tcard-bg{position:absolute;inset:0;background:radial-gradient(ellipse at 10% 50%,var(--col,#38bdf8)08 0%,transparent 60%);pointer-events:none}
      .tcard-thermo{flex-shrink:0;display:flex;align-items:center;position:relative}
      .tcard-body{flex:1;min-width:0;position:relative;display:flex;flex-direction:column;justify-content:space-between}
      .tname{font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .tval{font-size:22px;font-weight:800;line-height:1;margin:2px 0}
      .tunit{font-size:11px;font-weight:400;color:#94a3b8;margin-left:1px}
      /* mini barres */
      .mbars-wrap{margin-top:4px}
      .mbars-legend{display:flex;justify-content:space-between;font-size:7px;color:#334155;margin-top:1px}

      /* fenêtres */
      .wcard{background:#1e293b;border:1px solid #1e3a5f33;border-radius:10px;
        overflow:hidden;display:flex;flex-direction:column;transition:.3s}
      .wcard.wopen{border-color:#38bdf844;box-shadow:0 0 12px #38bdf811}
      .wcard.wclose{opacity:.8}
      .wwin{flex:1;display:flex;align-items:center;justify-content:center;padding:4px;min-height:0}
      .wfoot{padding:6px 8px;background:#0f172a55;text-align:center}
      .wname{font-size:9px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .wst{font-size:10px;font-weight:700;margin-top:1px;letter-spacing:.04em}
      .won{color:#38bdf8}.woff{color:#475569}
      .wcard .xrow{justify-content:center;margin-top:3px}

      /* prises */
      .pcard{background:#1e293b;border:1px solid #1e3a5f33;border-radius:10px;
        padding:5px 4px;text-align:center;cursor:pointer;transition:.25s;user-select:none;
        display:flex;flex-direction:column;align-items:center;justify-content:center}
      .pcard:hover{transform:scale(1.03)}
      .pcard.pon{border-color:#a78bfa44;background:#4c1d9518;box-shadow:0 0 14px #a78bfa22}
      .pring{flex-shrink:0}
      .pname{font-size:9px;color:#64748b;overflow:hidden;text-overflow:ellipsis;
        white-space:nowrap;width:100%;margin-top:1px;padding:0 3px}
      .ppow{font-size:10px;color:#a78bfa;font-weight:700;line-height:1}
      .ppill{font-size:8px;font-weight:700;border-radius:99px;padding:1px 6px;
        display:inline-block;letter-spacing:.05em;margin-top:2px}
      .ppillon{background:#a78bfa33;color:#a78bfa}
      .ppilloff{background:#1e293b;color:#334155;border:1px solid #2d3f55}

      /* interrupteurs */
      .swcard{position:relative;display:flex;align-items:center;gap:10px;background:#1e293b;
        border:1px solid #1e3a5f33;border-radius:10px;padding:8px 12px;
        cursor:pointer;transition:.25s;user-select:none;overflow:hidden}
      .swcard:hover{transform:translateX(2px)}
      .swcard.swon{border-color:#fbbf2444;background:#78350f18;box-shadow:0 0 16px #fbbf2415}
      .swglow{position:absolute;top:50%;left:40px;transform:translateY(-50%);
        width:60px;height:60px;border-radius:50%;transition:.5s;pointer-events:none}
      .sgon{background:radial-gradient(circle,#fbbf2415,transparent 70%)}
      .swico{flex-shrink:0;position:relative}
      .swinfo{flex:1;min-width:0;position:relative}
      .swname{font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .swst{font-size:9px;color:#64748b;margin-top:1px}
      .swon .swst{color:#fbbf24}
      .swtog{width:36px;height:19px;border-radius:99px;position:relative;
        transition:.3s;flex-shrink:0}
      .togon{background:linear-gradient(90deg,#d97706,#fbbf24);box-shadow:0 0 8px #fbbf2455}
      .togoff{background:#334155}
      .togthumb{position:absolute;top:3px;width:13px;height:13px;border-radius:50%;
        background:#fff;transition:.3s;box-shadow:0 1px 4px #0004}
      .togon .togthumb{left:20px}.togoff .togthumb{left:3px}

      /* volets */
      .vcard{background:#1e293b;border:1px solid #1e3a5f33;border-radius:10px;
        padding:7px;display:flex;flex-direction:column;overflow:hidden;transition:.2s}
      .vcard:hover{border-color:#34d39944}
      .vhdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;flex-shrink:0}
      .vname{font-size:9px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;
        white-space:nowrap;max-width:75%}
      .vpct{font-size:11px;font-weight:700;color:#34d399}
      .vwin{flex:1;border-radius:6px;overflow:hidden;margin-bottom:5px;min-height:0}
      .vslider{-webkit-appearance:none;width:100%;height:4px;border-radius:2px;
        background:linear-gradient(90deg,#34d399,#0f172a);outline:none;
        cursor:pointer;margin-bottom:5px;flex-shrink:0}
      .vslider::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;
        border-radius:50%;background:#34d399;box-shadow:0 0 5px #34d39988;cursor:pointer}
      .vbtns{display:flex;gap:3px;flex-shrink:0}
      .vb{flex:1;padding:4px;border:1px solid #1e3a5f;background:#0f172a;
        color:#94a3b8;border-radius:5px;font-size:9px;cursor:pointer;transition:.15s}
      .vb:hover{background:#1e3a5f;color:#e2e8f0}
      .vbstop{color:#fbbf24;border-color:#78350f44}

      /* sécurité */
      .fsection{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden}
      .fbg{position:absolute;inset:0;pointer-events:none}
      .foverlay{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;z-index:1}
      .fring{position:relative;width:120px;height:120px;border-radius:50%;display:flex;
        align-items:center;justify-content:center;transition:.5s}
      .frings2,.frings3{position:absolute;border-radius:50%;pointer-events:none}
      .frings2{inset:-14px;border:2px solid currentColor;opacity:.3;animation:ringpulse 2s infinite}
      .frings3{inset:-28px;border:1px solid currentColor;opacity:.15;animation:ringpulse 2s .4s infinite}
      @keyframes ringpulse{0%,100%{transform:scale(1);opacity:.3}50%{transform:scale(1.04);opacity:.1}}
      .fok{background:radial-gradient(#064e3b,#0f172a);border:3px solid #34d399;
        box-shadow:0 0 24px #34d39944;color:#34d399}
      .fok2,.fok3{color:#34d399}
      .falarm{background:radial-gradient(#450a0a,#0f172a);border:3px solid #f43f5e;
        box-shadow:0 0 30px #f43f5e88;animation:aringpulse .6s infinite;color:#f43f5e}
      .falarm2,.falarm3{color:#f43f5e}
      @keyframes aringpulse{0%,100%{box-shadow:0 0 30px #f43f5e88}50%{box-shadow:0 0 55px #f43f5ecc}}
      .fname{font-size:13px;font-weight:600;color:#94a3b8}
      .fstatus{font-size:15px;font-weight:700}
      .foktxt{color:#34d399}.falarmtxt{color:#f43f5e;animation:blink .5s infinite}
      .fmeta{font-size:10px;color:#475569}
    </style>`;
  }

  /* ── Render ── */
  _render() {
    if (!this.shadowRoot) return;
    const tab    = this._tabs[this._tab];
    const panels = {
      temperatures:  () => this._panelTemperatures(),
      fenetres:      () => this._panelFenetres(),
      prises:        () => this._panelPrises(),
      interrupteurs: () => this._panelInterrupteurs(),
      volets:        () => this._panelVolets(),
      fumee:         () => this._panelFumee(),
    };
    const now = new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});

    this.shadowRoot.innerHTML = this._css() + `
      <div class="card">
        <div class="hdr">
          <div><div class="htitle">🏠 Étage</div><div class="hsub">Mise à jour : ${now}</div></div>
          <div class="hdot"></div>
        </div>
        ${this._statusBar()}
        <div class="tabs">${this._renderTabs()}</div>
        <div class="content">${(panels[tab.key]||(() => ''))()}</div>
      </div>`;
  }

  connectedCallback() {
    this._render();
    this._interval = setInterval(() => this._render(), 30000);
  }
  disconnectedCallback() { clearInterval(this._interval); }
}

customElements.define('etage-card', EtageCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type:        'etage-card',
  name:        'Étage',
  description: "Tableau de bord de l'étage",
  preview:     false,
});

console.info(
  '%c ÉTAGE CARD %c v4.0.0 ',
  'background:#0ea5e9;color:#fff;padding:2px 6px;border-radius:3px 0 0 3px;font-weight:bold',
  'background:#1e293b;color:#38bdf8;padding:2px 6px;border-radius:0 3px 3px 0'
);
