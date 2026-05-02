/**
 * Étage Card — HACS Custom Card for Home Assistant
 * Gère : 6 fenêtres, 6 températures, 1 détecteur fumée,
 *         12 prises électriques, 7 interrupteurs, 6 volets
 * Version : 1.0.0
 */

/* ═══════════════════════════════════════════════════
   ÉDITEUR VISUEL
═══════════════════════════════════════════════════ */
class EtageCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
    this.attachShadow({ mode: 'open' });
  }

  set hass(hass) { this._hass = hass; this._render(); }
  setConfig(config) { this._config = { ...config }; this._render(); }

  _entityOptions(domain) {
    if (!this._hass) return [];
    return Object.keys(this._hass.states)
      .filter(e => !domain || e.startsWith(domain + '.'))
      .sort();
  }

  _allEntities() {
    if (!this._hass) return [];
    return Object.keys(this._hass.states).sort();
  }

  _sectionDefs() {
    return [
      { key: 'fenetres',      label: '🪟 Fenêtres',         count: 6, domain: 'binary_sensor', icon: '🪟' },
      { key: 'temperatures',  label: '🌡️ Températures',     count: 6, domain: 'sensor',         icon: '🌡️' },
      { key: 'prises',        label: '🔌 Prises électriques',count:12, domain: 'switch',         icon: '🔌' },
      { key: 'interrupteurs', label: '💡 Interrupteurs',     count: 7, domain: 'switch',         icon: '💡' },
      { key: 'volets',        label: '🏠 Volets',            count: 6, domain: 'cover',          icon: '🏠' },
      { key: 'fumee',         label: '🔥 Détecteur fumée',   count: 1, domain: 'binary_sensor',  icon: '🔥' },
    ];
  }

  _onChange(key, idx, value) {
    const cfg = JSON.parse(JSON.stringify(this._config));
    if (!cfg[key]) cfg[key] = [];
    cfg[key][idx] = value;
    this._config = cfg;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: cfg }, bubbles: true, composed: true }));
    this._render();
  }

  _onNameChange(key, idx, value) {
    const cfg = JSON.parse(JSON.stringify(this._config));
    const nameKey = key + '_names';
    if (!cfg[nameKey]) cfg[nameKey] = [];
    cfg[nameKey][idx] = value;
    this._config = cfg;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: cfg }, bubbles: true, composed: true }));
  }

  _render() {
    const sections = this._sectionDefs();
    const style = `
      <style>
        :host { display:block; font-family:'Segoe UI',sans-serif; }
        .editor { background:#0f172a; color:#e2e8f0; padding:16px; border-radius:12px; max-height:460px; overflow-y:auto; }
        .editor::-webkit-scrollbar { width:6px; }
        .editor::-webkit-scrollbar-track { background:#1e293b; }
        .editor::-webkit-scrollbar-thumb { background:#334155; border-radius:3px; }
        .section-header { display:flex; align-items:center; gap:8px; font-size:13px; font-weight:700;
          color:#38bdf8; text-transform:uppercase; letter-spacing:.08em; margin:18px 0 10px;
          padding-bottom:6px; border-bottom:1px solid #1e3a5f; }
        .row { display:grid; grid-template-columns:1fr 160px; gap:8px; margin-bottom:8px; align-items:center; }
        .row label { font-size:12px; color:#94a3b8; }
        input[type="text"], select {
          width:100%; background:#1e293b; border:1px solid #334155; color:#e2e8f0;
          border-radius:6px; padding:5px 8px; font-size:12px; outline:none; box-sizing:border-box; }
        input[type="text"]:focus, select:focus { border-color:#38bdf8; }
        .row2 { display:grid; grid-template-columns:90px 1fr; gap:6px; margin-bottom:8px; align-items:center; }
        .row2 input { background:#1e293b; border:1px solid #334155; color:#e2e8f0;
          border-radius:6px; padding:5px 8px; font-size:12px; outline:none; width:100%; box-sizing:border-box; }
        .pill { display:inline-block; background:#0ea5e9; color:#fff; font-size:10px;
          border-radius:99px; padding:1px 7px; margin-left:6px; font-weight:600; }
        h2 { margin:0 0 14px; font-size:15px; color:#f8fafc; text-align:center; letter-spacing:.05em; }
      </style>
    `;

    const sectionsHTML = sections.map(sec => {
      const entities = this._config[sec.key] || [];
      const names    = this._config[sec.key + '_names'] || [];
      const opts     = this._allEntities();
      const rows = Array.from({ length: sec.count }, (_, i) => {
        const selOpts = opts.map(e => `<option value="${e}" ${entities[i]===e?'selected':''}>${e}</option>`).join('');
        return `
          <div class="row2">
            <input type="text" placeholder="Nom ${i+1}" value="${names[i]||''}"
              oninput="this.getRootNode().host._onNameChange('${sec.key}',${i},this.value)" />
            <select onchange="this.getRootNode().host._onChange('${sec.key}',${i},this.value)">
              <option value="">— choisir entité —</option>
              ${selOpts}
            </select>
          </div>`;
      }).join('');
      return `
        <div class="section-header">${sec.icon} ${sec.label} <span class="pill">${sec.count}</span></div>
        ${rows}`;
    }).join('');

    this.shadowRoot.innerHTML = style + `
      <div class="editor">
        <h2>⚙️ Configuration Étage</h2>
        ${sectionsHTML}
      </div>`;
  }
}
customElements.define('etage-card-editor', EtageCardEditor);


/* ═══════════════════════════════════════════════════
   CARTE PRINCIPALE
═══════════════════════════════════════════════════ */
class EtageCard extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass   = null;
    this._tab    = 0;
    this.attachShadow({ mode: 'open' });
    this._tabs = [
      { key:'temperatures',  label:'Températures', icon:'🌡️', color:'#f97316' },
      { key:'fenetres',      label:'Fenêtres',     icon:'🪟', color:'#38bdf8' },
      { key:'prises',        label:'Prises',       icon:'🔌', color:'#a78bfa' },
      { key:'interrupteurs', label:'Lumières',     icon:'💡', color:'#fbbf24' },
      { key:'volets',        label:'Volets',       icon:'🏠', color:'#34d399' },
      { key:'fumee',         label:'Sécurité',     icon:'🔥', color:'#f43f5e' },
    ];
  }

  static get properties() { return {}; }

  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() { return 5; }

  static getConfigElement() {
    return document.createElement('etage-card-editor');
  }

  static getStubConfig() {
    return {
      fenetres: [],      fenetres_names: [],
      temperatures: [],  temperatures_names: [],
      prises: [],        prises_names: [],
      interrupteurs: [], interrupteurs_names: [],
      volets: [],        volets_names: [],
      fumee: [],         fumee_names: [],
    };
  }

  /* ── Actions ── */
  _toggle(entity) {
    if (!this._hass || !entity) return;
    const domain = entity.split('.')[0];
    const service = domain === 'cover' ? 'toggle' :
                    this._hass.states[entity]?.state === 'on' ? 'turn_off' : 'turn_on';
    this._hass.callService(domain, service, { entity_id: entity });
  }

  _coverCmd(entity, cmd) {
    if (!this._hass || !entity) return;
    this._hass.callService('cover', cmd, { entity_id: entity });
  }

  _setPosition(entity, pos) {
    if (!this._hass || !entity) return;
    this._hass.callService('cover', 'set_cover_position', { entity_id: entity, position: pos });
  }

  /* ── State helpers ── */
  _state(entity) {
    return entity && this._hass ? (this._hass.states[entity] || null) : null;
  }

  _attr(entity, attr) {
    const s = this._state(entity);
    return s ? (s.attributes?.[attr] ?? null) : null;
  }

  _isOn(entity) {
    const s = this._state(entity);
    return s ? ['on','open','true','locked'].includes(s.state) : false;
  }

  /* ── Temperature bar color ── */
  _tempColor(val) {
    const v = parseFloat(val);
    if (isNaN(v)) return '#38bdf8';
    if (v < 15)  return '#60a5fa';
    if (v < 20)  return '#34d399';
    if (v < 25)  return '#fbbf24';
    if (v < 28)  return '#f97316';
    return '#f43f5e';
  }

  /* ── Render tabs ── */
  _renderTabs() {
    return this._tabs.map((t, i) => `
      <button class="tab ${this._tab===i?'active':''}" data-tab="${i}"
        style="--tc:${t.color}" onclick="this.getRootNode().host._setTab(${i})">
        <span class="tab-icon">${t.icon}</span>
        <span class="tab-label">${t.label}</span>
      </button>`).join('');
  }

  _setTab(i) { this._tab = i; this._render(); }

  /* ── Temperature panel ── */
  _panelTemperatures() {
    const entities = this._config.temperatures || [];
    const names    = this._config.temperatures_names || [];
    const items = Array.from({ length: 6 }, (_, i) => {
      const e   = entities[i];
      const s   = this._state(e);
      const val = s ? s.state : '—';
      const unit= this._attr(e,'unit_of_measurement') || '°C';
      const num = parseFloat(val);
      const pct = isNaN(num) ? 0 : Math.min(100, Math.max(0, ((num - 10) / 30) * 100));
      const col = this._tempColor(val);
      const nm  = names[i] || (e ? e.split('.')[1]?.replace(/_/g,' ') : `Capteur ${i+1}`);
      return `
        <div class="temp-card">
          <div class="temp-name">${nm}</div>
          <div class="temp-val" style="color:${col}">${isNaN(num)?'—':num.toFixed(1)}<span class="unit">${unit}</span></div>
          <div class="temp-bar-bg"><div class="temp-bar" style="width:${pct}%;background:${col}"></div></div>
        </div>`;
    }).join('');
    return `<div class="grid-2">${items}</div>`;
  }

  /* ── Windows panel ── */
  _panelFenetres() {
    const entities = this._config.fenetres || [];
    const names    = this._config.fenetres_names || [];
    return `<div class="grid-3">${Array.from({ length: 6 }, (_, i) => {
      const e    = entities[i];
      const open = this._isOn(e);
      const nm   = names[i] || (e ? e.split('.')[1]?.replace(/_/g,' ') : `Fenêtre ${i+1}`);
      return `
        <div class="window-card ${open?'open':'closed'}">
          <div class="win-svg">${open ? this._svgWindowOpen() : this._svgWindowClosed()}</div>
          <div class="win-name">${nm}</div>
          <div class="win-status ${open?'status-open':'status-closed'}">${open?'Ouverte':'Fermée'}</div>
        </div>`;
    }).join('')}</div>`;
  }

  _svgWindowOpen() {
    return `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
      <rect x="2" y="4" width="36" height="33" rx="3" stroke="#38bdf8" stroke-width="2.5" fill="#0ea5e933"/>
      <line x1="20" y1="4" x2="20" y2="37" stroke="#38bdf8" stroke-width="1.5"/>
      <line x1="2" y1="20" x2="38" y2="20" stroke="#38bdf8" stroke-width="1.5"/>
      <path d="M6 8 L16 16" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="20" cy="20" r="3" fill="#38bdf8" opacity=".6"/>
    </svg>`;
  }

  _svgWindowClosed() {
    return `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
      <rect x="2" y="4" width="36" height="33" rx="3" stroke="#475569" stroke-width="2.5" fill="#1e293b"/>
      <line x1="20" y1="4" x2="20" y2="37" stroke="#475569" stroke-width="1.5"/>
      <line x1="2" y1="20" x2="38" y2="20" stroke="#475569" stroke-width="1.5"/>
      <rect x="17" y="17" width="6" height="6" rx="1" fill="#475569"/>
    </svg>`;
  }

  /* ── Prises panel ── */
  _panelPrises() {
    const entities = this._config.prises || [];
    const names    = this._config.prises_names || [];
    return `<div class="grid-4">${Array.from({ length: 12 }, (_, i) => {
      const e   = entities[i];
      const on  = this._isOn(e);
      const pw  = this._attr(e, 'current_power_w') ?? this._attr(e, 'power') ?? null;
      const nm  = names[i] || (e ? e.split('.')[1]?.replace(/_/g,' ') : `Prise ${i+1}`);
      return `
        <div class="prise-card ${on?'on':'off'}" onclick="this.getRootNode().host._toggle('${e||''}')">
          <div class="prise-icon">${this._svgPlug(on)}</div>
          <div class="prise-name">${nm}</div>
          ${pw!==null?`<div class="prise-power">${parseFloat(pw).toFixed(0)}W</div>`:''}
          <div class="toggle-pill ${on?'pill-on':'pill-off'}">${on?'ON':'OFF'}</div>
        </div>`;
    }).join('')}</div>`;
  }

  _svgPlug(on) {
    const c = on ? '#a78bfa' : '#475569';
    return `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
      <rect x="8" y="2" width="16" height="18" rx="4" stroke="${c}" stroke-width="2" fill="${on?'#4c1d9522':'#0f172a'}"/>
      <line x1="12" y1="6" x2="12" y2="12" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
      <line x1="20" y1="6" x2="20" y2="12" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
      <path d="M16 20 L16 28" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M11 28 L21 28" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`;
  }

  /* ── Interrupteurs panel ── */
  _panelInterrupteurs() {
    const entities = this._config.interrupteurs || [];
    const names    = this._config.interrupteurs_names || [];
    return `<div class="grid-sw">${Array.from({ length: 7 }, (_, i) => {
      const e   = entities[i];
      const on  = this._isOn(e);
      const nm  = names[i] || (e ? e.split('.')[1]?.replace(/_/g,' ') : `Lumière ${i+1}`);
      return `
        <div class="sw-card ${on?'sw-on':'sw-off'}" onclick="this.getRootNode().host._toggle('${e||''}')">
          <div class="sw-bulb">${this._svgBulb(on)}</div>
          <div class="sw-info">
            <div class="sw-name">${nm}</div>
            <div class="sw-state">${on?'Allumée':'Éteinte'}</div>
          </div>
          <div class="sw-toggle ${on?'tog-on':'tog-off'}">
            <div class="tog-thumb"></div>
          </div>
        </div>`;
    }).join('')}</div>`;
  }

  _svgBulb(on) {
    const c = on ? '#fbbf24' : '#475569';
    const glow = on ? `<circle cx="16" cy="13" r="10" fill="#fbbf2411"/>` : '';
    return `<svg viewBox="0 0 32 32" width="32" height="32" fill="none">
      ${glow}
      <path d="M16 4 C10 4 6 8.5 6 14 C6 18 8.5 21.5 12 23.5 L12 26 C12 27.1 12.9 28 14 28 L18 28 C19.1 28 20 27.1 20 26 L20 23.5 C23.5 21.5 26 18 26 14 C26 8.5 22 4 16 4Z"
        stroke="${c}" stroke-width="1.8" fill="${on?'#fbbf2422':'#0f172a'}"/>
      <line x1="13" y1="28" x2="19" y2="28" stroke="${c}" stroke-width="1.5"/>
      ${on?`<line x1="16" y1="1" x2="16" y2="3" stroke="${c}" stroke-width="2"/>
      <line x1="25" y1="5" x2="23.5" y2="6.5" stroke="${c}" stroke-width="2"/>
      <line x1="7" y1="5" x2="8.5" y2="6.5" stroke="${c}" stroke-width="2"/>`:''}
    </svg>`;
  }

  /* ── Volets panel ── */
  _panelVolets() {
    const entities = this._config.volets || [];
    const names    = this._config.volets_names || [];
    return `<div class="grid-vol">${Array.from({ length: 6 }, (_, i) => {
      const e    = entities[i];
      const s    = this._state(e);
      const pos  = this._attr(e,'current_position') ?? 50;
      const st   = s?.state || 'unknown';
      const nm   = names[i] || (e ? e.split('.')[1]?.replace(/_/g,' ') : `Volet ${i+1}`);
      const pct  = Math.round(pos);
      return `
        <div class="vol-card">
          <div class="vol-header">
            <div class="vol-name">${nm}</div>
            <div class="vol-pct">${pct}%</div>
          </div>
          <div class="vol-visual">
            <div class="vol-frame">
              ${this._renderShutter(pct)}
            </div>
          </div>
          <div class="vol-slider-wrap">
            <input type="range" min="0" max="100" value="${pct}" class="vol-slider"
              oninput="this.getRootNode().host._setPosition('${e||''}',parseInt(this.value))"
              onchange="this.getRootNode().host._setPosition('${e||''}',parseInt(this.value))"/>
          </div>
          <div class="vol-btns">
            <button class="vbtn up"   onclick="this.getRootNode().host._coverCmd('${e||''}','open_cover')">▲</button>
            <button class="vbtn stop" onclick="this.getRootNode().host._coverCmd('${e||''}','stop_cover')">■</button>
            <button class="vbtn down" onclick="this.getRootNode().host._coverCmd('${e||''}','close_cover')">▼</button>
          </div>
        </div>`;
    }).join('')}</div>`;
  }

  _renderShutter(pct) {
    // pct = 0 = fully closed, 100 = fully open
    const slats   = 6;
    const h       = 40;
    const closed  = 1 - pct / 100;
    const slat_h  = 5;
    const gap     = (h * closed) / slats;
    let html = '';
    for (let i = 0; i < slats; i++) {
      const y = 2 + i * (slat_h + gap);
      html += `<div class="slat" style="top:${y}px"></div>`;
    }
    return html;
  }

  /* ── Fumee panel ── */
  _panelFumee() {
    const entities = this._config.fumee || [];
    const names    = this._config.fumee_names || [];
    const e    = entities[0];
    const on   = this._isOn(e);
    const s    = this._state(e);
    const nm   = names[0] || (e ? e.split('.')[1]?.replace(/_/g,' ') : 'Détecteur de fumée');
    const last = s?.last_changed ? new Date(s.last_changed).toLocaleString('fr-FR') : '—';
    return `
      <div class="fumee-center">
        <div class="fumee-ring ${on?'fumee-alarm':'fumee-ok'}">
          <div class="fumee-inner">
            ${on ? this._svgSmoke() : this._svgCheck()}
          </div>
        </div>
        <div class="fumee-name">${nm}</div>
        <div class="fumee-status ${on?'f-alarm':'f-ok'}">
          ${on ? '🚨 ALARME DÉTECTÉE !' : '✅ Tout est normal'}
        </div>
        <div class="fumee-meta">Dernier changement : ${last}</div>
        ${on?`<div class="fumee-pulse"></div>`:''}
      </div>`;
  }

  _svgSmoke() {
    return `<svg viewBox="0 0 60 60" width="60" height="60" fill="none">
      <path d="M30 10 Q25 18 30 22 Q35 26 30 34" stroke="#f43f5e" stroke-width="3" stroke-linecap="round"/>
      <path d="M20 16 Q15 24 20 28 Q25 32 20 40" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>
      <path d="M40 16 Q45 24 40 28 Q35 32 40 40" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>
    </svg>`;
  }

  _svgCheck() {
    return `<svg viewBox="0 0 60 60" width="60" height="60" fill="none">
      <path d="M15 30 L26 41 L45 20" stroke="#34d399" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  /* ── CSS ── */
  _styles() {
    return `<style>
      :host { display:block; }
      * { box-sizing:border-box; margin:0; padding:0; }

      .card {
        background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%);
        border-radius: 16px;
        overflow: hidden;
        height: 500px;
        display: flex;
        flex-direction: column;
        font-family: 'Segoe UI', system-ui, sans-serif;
        color: #e2e8f0;
        box-shadow: 0 20px 60px #00000066;
        border: 1px solid #1e3a5f44;
      }

      /* ── Header ── */
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px 8px;
        background: linear-gradient(90deg, #0f172a, #1e293b);
        border-bottom: 1px solid #1e3a5f;
        flex-shrink: 0;
      }
      .title { font-size:14px; font-weight:700; letter-spacing:.08em; color:#f8fafc; }
      .subtitle { font-size:10px; color:#64748b; margin-top:1px; }
      .live-dot { width:7px; height:7px; border-radius:50%; background:#34d399;
        box-shadow:0 0 6px #34d399; animation:pulse 2s infinite; }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

      /* ── Tabs ── */
      .tabs {
        display: flex;
        gap: 2px;
        padding: 8px 10px 0;
        background: #0f172a;
        flex-shrink: 0;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .tabs::-webkit-scrollbar { display:none; }
      .tab {
        display: flex; flex-direction: column; align-items: center;
        gap: 1px; padding: 5px 8px 6px;
        background: #1e293b; border: 1px solid #1e3a5f44;
        border-radius: 8px 8px 0 0; cursor: pointer;
        font-size: 9px; color: #64748b; font-weight:600;
        letter-spacing:.04em; text-transform:uppercase;
        transition: all .2s; white-space:nowrap; min-width:52px;
        border-bottom:2px solid transparent;
      }
      .tab:hover { background:#1e3a5f; color:#94a3b8; }
      .tab.active {
        background: linear-gradient(180deg, #1e3a5f, #1e293b);
        color: var(--tc);
        border-color: #1e3a5f44;
        border-bottom-color: var(--tc);
        text-shadow: 0 0 8px var(--tc);
      }
      .tab-icon { font-size:16px; line-height:1; }

      /* ── Content ── */
      .content {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        scrollbar-width: thin;
        scrollbar-color: #334155 transparent;
      }
      .content::-webkit-scrollbar { width:5px; }
      .content::-webkit-scrollbar-thumb { background:#334155; border-radius:3px; }

      /* ── Temperature ── */
      .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
      .temp-card {
        background:#1e293b; border:1px solid #1e3a5f; border-radius:10px;
        padding:10px 12px; transition:.2s;
      }
      .temp-card:hover { border-color:#38bdf855; transform:translateY(-1px); }
      .temp-name { font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:.06em; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .temp-val { font-size:24px; font-weight:800; line-height:1; margin-bottom:8px; }
      .unit { font-size:13px; font-weight:400; color:#94a3b8; margin-left:1px; }
      .temp-bar-bg { background:#0f172a; border-radius:99px; height:5px; overflow:hidden; }
      .temp-bar { height:100%; border-radius:99px; transition:width .6s ease, background .6s; }

      /* ── Windows ── */
      .grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
      .window-card {
        background:#1e293b; border-radius:10px; padding:10px 8px;
        text-align:center; border:1px solid #1e3a5f; transition:.2s;
      }
      .window-card.open { border-color:#38bdf855; background:#0ea5e908; }
      .win-svg { display:flex; justify-content:center; margin-bottom:6px; }
      .win-name { font-size:10px; color:#94a3b8; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; }
      .win-status { font-size:10px; font-weight:700; margin-top:3px; letter-spacing:.05em; }
      .status-open { color:#38bdf8; text-shadow:0 0 6px #38bdf855; }
      .status-closed { color:#475569; }

      /* ── Prises ── */
      .grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; }
      .prise-card {
        background:#1e293b; border:1px solid #1e3a5f; border-radius:10px;
        padding:8px 6px; text-align:center; cursor:pointer; transition:.2s;
        user-select:none;
      }
      .prise-card:hover { transform:translateY(-2px); }
      .prise-card.on { border-color:#a78bfa55; background:#4c1d9511; }
      .prise-card.on .prise-name { color:#c4b5fd; }
      .prise-icon { display:flex; justify-content:center; margin-bottom:4px; }
      .prise-name { font-size:9px; color:#64748b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-bottom:3px; }
      .prise-power { font-size:9px; color:#a78bfa; margin-bottom:3px; }
      .toggle-pill { font-size:8px; font-weight:700; border-radius:99px; padding:1px 6px; display:inline-block; letter-spacing:.05em; }
      .pill-on { background:#a78bfa33; color:#a78bfa; }
      .pill-off { background:#1e293b; color:#334155; border:1px solid #334155; }

      /* ── Interrupteurs ── */
      .grid-sw { display:flex; flex-direction:column; gap:7px; }
      .sw-card {
        display:flex; align-items:center; gap:12px;
        background:#1e293b; border:1px solid #1e3a5f; border-radius:10px;
        padding:10px 14px; cursor:pointer; transition:.2s; user-select:none;
      }
      .sw-card:hover { transform:translateX(2px); }
      .sw-card.sw-on { border-color:#fbbf2444; background:#78350f11; }
      .sw-bulb { flex-shrink:0; }
      .sw-info { flex:1; min-width:0; }
      .sw-name { font-size:12px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .sw-state { font-size:10px; color:#64748b; margin-top:1px; }
      .sw-on .sw-state { color:#fbbf24; }
      .sw-toggle {
        width:38px; height:20px; border-radius:99px; position:relative;
        transition:.3s; flex-shrink:0; cursor:pointer;
      }
      .tog-on { background:linear-gradient(90deg,#d97706,#fbbf24); box-shadow:0 0 8px #fbbf2455; }
      .tog-off { background:#334155; }
      .tog-thumb {
        position:absolute; top:3px; width:14px; height:14px; border-radius:50%;
        background:#fff; transition:.3s; box-shadow:0 1px 4px #0004;
      }
      .tog-on .tog-thumb { left:21px; }
      .tog-off .tog-thumb { left:3px; }

      /* ── Volets ── */
      .grid-vol { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
      .vol-card {
        background:#1e293b; border:1px solid #1e3a5f; border-radius:10px;
        padding:8px; transition:.2s;
      }
      .vol-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; }
      .vol-name { font-size:10px; color:#94a3b8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:75%; }
      .vol-pct { font-size:12px; font-weight:700; color:#34d399; }
      .vol-visual {
        background:#0f172a; border-radius:6px; height:48px;
        position:relative; overflow:hidden; margin-bottom:6px;
        border:1px solid #1e3a5f;
      }
      .vol-frame { position:absolute; inset:4px; }
      .slat {
        position:absolute; left:0; right:0; height:4px;
        background:linear-gradient(90deg,#334155,#475569); border-radius:1px;
      }
      .vol-slider-wrap { margin-bottom:6px; }
      .vol-slider {
        -webkit-appearance:none; width:100%; height:4px; border-radius:2px;
        background:linear-gradient(90deg,#34d399,#0f172a); outline:none; cursor:pointer;
      }
      .vol-slider::-webkit-slider-thumb {
        -webkit-appearance:none; width:14px; height:14px; border-radius:50%;
        background:#34d399; box-shadow:0 0 6px #34d39988; cursor:pointer;
      }
      .vol-btns { display:flex; gap:4px; justify-content:center; }
      .vbtn {
        flex:1; padding:4px 0; border:1px solid #1e3a5f; background:#0f172a;
        color:#94a3b8; border-radius:5px; font-size:10px; cursor:pointer; transition:.15s;
      }
      .vbtn:hover { background:#1e3a5f; color:#e2e8f0; }
      .vbtn.stop { color:#fbbf24; border-color:#78350f55; }

      /* ── Fumée ── */
      .fumee-center { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:12px; padding:20px; }
      .fumee-ring {
        width:120px; height:120px; border-radius:50%;
        display:flex; align-items:center; justify-content:center;
        position:relative; transition:.5s;
      }
      .fumee-ok  { background:radial-gradient(circle,#064e3b,#0f172a); border:3px solid #34d399; box-shadow:0 0 20px #34d39944; }
      .fumee-alarm { background:radial-gradient(circle,#450a0a,#0f172a); border:3px solid #f43f5e; box-shadow:0 0 30px #f43f5e88; animation:alarm-ring .5s infinite; }
      @keyframes alarm-ring { 0%,100%{box-shadow:0 0 30px #f43f5e88} 50%{box-shadow:0 0 50px #f43f5ecc} }
      .fumee-inner { display:flex; align-items:center; justify-content:center; }
      .fumee-name { font-size:13px; font-weight:600; color:#94a3b8; }
      .fumee-status { font-size:15px; font-weight:700; }
      .f-ok    { color:#34d399; }
      .f-alarm { color:#f43f5e; animation:blink .5s infinite; }
      @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.5} }
      .fumee-meta { font-size:10px; color:#475569; }

      /* ── Scrollbar ── */
      ::-webkit-scrollbar { width:4px; }
      ::-webkit-scrollbar-thumb { background:#334155; border-radius:2px; }
    </style>`;
  }

  /* ── Main render ── */
  _render() {
    const tab = this._tabs[this._tab];
    const panels = {
      temperatures:  () => this._panelTemperatures(),
      fenetres:      () => this._panelFenetres(),
      prises:        () => this._panelPrises(),
      interrupteurs: () => this._panelInterrupteurs(),
      volets:        () => this._panelVolets(),
      fumee:         () => this._panelFumee(),
    };
    const now = new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });

    this.shadowRoot.innerHTML = this._styles() + `
      <div class="card">
        <div class="header">
          <div>
            <div class="title">🏠 Étage</div>
            <div class="subtitle">Mise à jour : ${now}</div>
          </div>
          <div class="live-dot"></div>
        </div>
        <div class="tabs">${this._renderTabs()}</div>
        <div class="content">${(panels[tab.key] || (() => '<p>—</p>'))()}</div>
      </div>`;
  }

  connectedCallback() {
    if (!this._hass) this._render();
    // Auto-refresh clock every 30s
    this._interval = setInterval(() => this._render(), 30000);
  }

  disconnectedCallback() {
    clearInterval(this._interval);
  }
}

customElements.define('etage-card', EtageCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'etage-card',
  name: 'Étage',
  description: 'Tableau de bord de l'étage : fenêtres, températures, prises, lumières, volets & détecteur fumée',
  preview: true,
  documentationURL: 'https://github.com/ton-user/etage-card',
});

console.info('%c ÉTAGE CARD %c v1.0.0 ', 
  'background:#0ea5e9;color:#fff;padding:2px 6px;border-radius:3px 0 0 3px;font-weight:bold',
  'background:#1e293b;color:#38bdf8;padding:2px 6px;border-radius:0 3px 3px 0');
