/* ═══════════════════════════════════════════
   ÉTAGE CARD — HACS Custom Card v2.0.0
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
    const keys = ['temperatures','fenetres','prises','interrupteurs','volets','fumee'];
    const out  = JSON.parse(JSON.stringify(cfg || {}));
    keys.forEach(k => {
      if (!Array.isArray(out[k]))      out[k]          = [];
      if (!Array.isArray(out[k+'_names'])) out[k+'_names'] = [];
      for (let i = 0; i < out[k].length; i++) {
        if (!out[k][i])       out[k][i]          = '';
        if (!out[k+'_names'][i]) out[k+'_names'][i] = '';
      }
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
      { key:'temperatures',  label:'Températures',  icon:'🌡️', count:6  },
      { key:'fenetres',      label:'Fenêtres',      icon:'🪟', count:6  },
      { key:'prises',        label:'Prises',        icon:'🔌', count:12 },
      { key:'interrupteurs', label:'Lumières',      icon:'💡', count:7  },
      { key:'volets',        label:'Volets',        icon:'🏠', count:6  },
      { key:'fumee',         label:'Sécurité',      icon:'🔥', count:1  },
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
      const curVal   = vals[i] || '';
      const curName  = (names[i] || '').replace(/"/g, '&quot;');
      const optsHTML = allE.map(e => `<option value="${e}">${e}</option>`).join('');
      return `
        <div class="erow">
          <span class="enum">${i+1}</span>
          <input class="ename" type="text" placeholder="Label…" value="${curName}"
            data-k="${sec.key}_names" data-i="${i}" />
          <div class="combo">
            <div class="cdisplay">
              <input class="csearch" type="text" placeholder="🔍 Rechercher…"
                autocomplete="off" spellcheck="false"
                value="${curVal}" data-k="${sec.key}" data-i="${i}" />
              <button class="cclr" data-k="${sec.key}" data-i="${i}">✕</button>
            </div>
            <div class="cdrop" data-i="${i}"></div>
          </div>
        </div>`;
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
      const drop = this.shadowRoot.querySelector(`.cdrop[data-i="${i}"]`);

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
  set hass(h)       { this._hass = h; this._render(); }
  getCardSize()     { return 5; }

  static getConfigElement() { return document.createElement('etage-card-editor'); }
  static getStubConfig()    { return {}; }

  /* ── helpers ── */
  _st(e)     { return (e && this._hass) ? (this._hass.states[e] || null) : null; }
  _attr(e,a) { const s=this._st(e); return s ? (s.attributes?.[a] ?? null) : null; }
  _on(e)     { const s=this._st(e); return s ? ['on','open','true','locked'].includes(s.state) : false; }

  _tempColor(v) {
    if (v < 15) return '#60a5fa';
    if (v < 20) return '#34d399';
    if (v < 25) return '#fbbf24';
    if (v < 28) return '#f97316';
    return '#f43f5e';
  }

  /* ── Extra pills : humidité + batterie ── */
  _extra(e) {
    if (!e || !this._hass) return '';
    const s = this._hass.states[e];
    if (!s) return '';
    const a   = s.attributes || {};
    const hum = a.humidity ?? null;
    const bat = a.battery ?? a.battery_level ?? a.battery_percent ?? null;
    let html  = '';
    if (hum !== null) {
      const h = parseFloat(hum);
      const c = h<40?'#60a5fa':h<60?'#34d399':h<75?'#fbbf24':'#f43f5e';
      html += `<span class="xpill"><span>💧</span><b style="color:${c}">${h.toFixed(0)}%</b></span>`;
    }
    if (bat !== null) {
      const b = parseFloat(bat);
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
      const pct = isNaN(val) ? 0 : Math.min(100, Math.max(0, ((val-10)/30)*100));
      const nm  = names[i] || e.split('.')[1].replace(/_/g,' ');
      const xtr = this._extra(e);
      return `<div class="tcard">
        <div class="tname">${nm}</div>
        <div class="tval" style="color:${col}">${isNaN(val)?'—':val.toFixed(1)}<span class="tunit">${unit}</span></div>
        <div class="tbar"><div class="tfill" style="width:${pct}%;background:${col}"></div></div>
        ${xtr}
      </div>`;
    }).filter(Boolean).join('');
    if (!items) return '<div class="empty">Aucun capteur configuré</div>';
    return `<div class="g2">${items}</div>`;
  }

  _panelFenetres() {
    const ents  = (this._config.fenetres       || []);
    const names = (this._config.fenetres_names || []);
    const items = ents.map((e,i) => {
      if (!e) return '';
      const open = this._on(e);
      const nm   = names[i] || e.split('.')[1].replace(/_/g,' ');
      const xtr  = this._extra(e);
      return `<div class="wcard ${open?'wopen':''}">
        ${open ? this._icoWinOpen() : this._icoWinClosed()}
        <div class="wname">${nm}</div>
        <div class="wst ${open?'won':'woff'}">${open?'Ouverte':'Fermée'}</div>
        ${xtr}
      </div>`;
    }).filter(Boolean).join('');
    if (!items) return '<div class="empty">Aucune fenêtre configurée</div>';
    return `<div class="g3">${items}</div>`;
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
        ${this._icoPlug(on)}
        <div class="pname">${nm}</div>
        ${pw!==null?`<div class="ppow">${parseFloat(pw).toFixed(0)}W</div>`:''}
        <div class="ppill ${on?'ppillon':'ppilloff'}">${on?'ON':'OFF'}</div>
      </div>`;
    }).filter(Boolean).join('');
    if (!items) return '<div class="empty">Aucune prise configurée</div>';
    return `<div class="g4">${items}</div>`;
  }

  _panelInterrupteurs() {
    const ents  = (this._config.interrupteurs       || []);
    const names = (this._config.interrupteurs_names || []);
    const items = ents.map((e,i) => {
      if (!e) return '';
      const on = this._on(e);
      const nm = names[i] || e.split('.')[1].replace(/_/g,' ');
      return `<div class="swcard ${on?'swon':''}" onclick="this.getRootNode().host._toggle('${e}')">
        ${this._icoBulb(on)}
        <div class="swinfo">
          <div class="swname">${nm}</div>
          <div class="swst">${on?'Allumée':'Éteinte'}</div>
        </div>
        <div class="swtog ${on?'togon':'togoff'}"><div class="togthumb"></div></div>
      </div>`;
    }).filter(Boolean).join('');
    if (!items) return '<div class="empty">Aucun interrupteur configuré</div>';
    return `<div class="gsw">${items}</div>`;
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
        <div class="vvis">${this._shutterSVG(pct)}</div>
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
    return `<div class="gv">${items}</div>`;
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
    const xtr  = this._extra(e);
    return `<div class="fcenter">
      <div class="fring ${on?'falarm':'fok'}">
        ${on ? this._icoSmoke() : this._icoCheck()}
      </div>
      <div class="fname">${nm}</div>
      <div class="fstatus ${on?'falarmtxt':'foktxt'}">${on?'🚨 ALARME DÉTECTÉE !':'✅ Tout est normal'}</div>
      ${xtr}
      <div class="fmeta">Dernier changement : ${last}</div>
    </div>`;
  }

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
  _setTab(i) { this._tab = i; this._render(); }

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

      /* content */
      .content{flex:1;overflow:hidden;padding:9px}

      /* empty */
      .empty{height:100%;display:flex;align-items:center;justify-content:center;
        color:#334155;font-size:12px;font-style:italic}

      /* extra pills */
      .xrow{display:flex;gap:5px;margin-top:5px;flex-wrap:wrap}
      .xpill{display:inline-flex;align-items:center;gap:3px;background:#0f172a;
        border:1px solid #1e3a5f;border-radius:99px;padding:2px 7px 2px 5px;font-size:10px}
      .xpill b{font-weight:700}

      /* grilles */
      .g2{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;align-content:start}
      .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;align-content:start}
      .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;align-content:start}
      .gsw{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;align-content:start}
      .gv{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;align-content:start}

      /* température */
      .tcard{background:#1e293b;border:1px solid #1e3a5f;border-radius:8px;padding:8px 10px}
      .tname{font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;
        margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .tval{font-size:20px;font-weight:800;line-height:1;margin-bottom:6px}
      .tunit{font-size:11px;font-weight:400;color:#94a3b8;margin-left:1px}
      .tbar{background:#0f172a;border-radius:99px;height:4px;overflow:hidden}
      .tfill{height:100%;border-radius:99px;transition:width .6s,background .6s}

      /* fenêtres */
      .wcard{background:#1e293b;border:1px solid #1e3a5f;border-radius:8px;
        padding:8px 6px;text-align:center}
      .wcard.wopen{border-color:#38bdf833;background:#0ea5e908}
      .wname{font-size:9px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:4px}
      .wst{font-size:9px;font-weight:700;margin-top:2px;letter-spacing:.04em}
      .won{color:#38bdf8}.woff{color:#475569}
      .wcard .xrow{justify-content:center}

      /* prises */
      .pcard{background:#1e293b;border:1px solid #1e3a5f;border-radius:8px;
        padding:6px 4px;text-align:center;cursor:pointer;transition:.2s;user-select:none}
      .pcard:hover{background:#1e3a5f44}
      .pcard.pon{border-color:#a78bfa44;background:#4c1d9511}
      .pname{font-size:9px;color:#64748b;overflow:hidden;text-overflow:ellipsis;
        white-space:nowrap;margin-top:2px}
      .ppow{font-size:9px;color:#a78bfa;margin-top:1px}
      .ppill{font-size:8px;font-weight:700;border-radius:99px;padding:1px 6px;
        display:inline-block;letter-spacing:.05em;margin-top:2px}
      .ppillon{background:#a78bfa33;color:#a78bfa}
      .ppilloff{background:#1e293b;color:#334155;border:1px solid #334155}

      /* interrupteurs */
      .swcard{display:flex;align-items:center;gap:8px;background:#1e293b;
        border:1px solid #1e3a5f;border-radius:8px;padding:7px 10px;
        cursor:pointer;transition:.2s;user-select:none}
      .swcard:hover{background:#1e3a5f44}
      .swcard.swon{border-color:#fbbf2444;background:#78350f11}
      .swinfo{flex:1;min-width:0}
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
      .vcard{background:#1e293b;border:1px solid #1e3a5f;border-radius:8px;padding:7px}
      .vhdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
      .vname{font-size:9px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;
        white-space:nowrap;max-width:75%}
      .vpct{font-size:11px;font-weight:700;color:#34d399}
      .vvis{background:#0f172a;border-radius:5px;border:1px solid #1e3a5f;
        margin-bottom:5px;overflow:hidden}
      .vslider{-webkit-appearance:none;width:100%;height:4px;border-radius:2px;
        background:linear-gradient(90deg,#34d399,#0f172a);outline:none;
        cursor:pointer;margin-bottom:5px}
      .vslider::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;
        border-radius:50%;background:#34d399;box-shadow:0 0 5px #34d39988;cursor:pointer}
      .vbtns{display:flex;gap:3px}
      .vb{flex:1;padding:3px;border:1px solid #1e3a5f;background:#0f172a;
        color:#94a3b8;border-radius:4px;font-size:9px;cursor:pointer;transition:.15s}
      .vb:hover{background:#1e3a5f;color:#e2e8f0}
      .vbstop{color:#fbbf24;border-color:#78350f44}

      /* sécurité */
      .fcenter{display:flex;flex-direction:column;align-items:center;
        justify-content:center;height:100%;gap:10px}
      .fring{width:110px;height:110px;border-radius:50%;display:flex;
        align-items:center;justify-content:center;transition:.5s}
      .fok{background:radial-gradient(#064e3b,#0f172a);border:3px solid #34d399;
        box-shadow:0 0 20px #34d39944}
      .falarm{background:radial-gradient(#450a0a,#0f172a);border:3px solid #f43f5e;
        box-shadow:0 0 30px #f43f5e88;animation:aringpulse .5s infinite}
      @keyframes aringpulse{0%,100%{box-shadow:0 0 30px #f43f5e88}50%{box-shadow:0 0 50px #f43f5ecc}}
      .fname{font-size:12px;font-weight:600;color:#94a3b8}
      .fstatus{font-size:14px;font-weight:700}
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
  '%c ÉTAGE CARD %c v2.0.0 ',
  'background:#0ea5e9;color:#fff;padding:2px 6px;border-radius:3px 0 0 3px;font-weight:bold',
  'background:#1e293b;color:#38bdf8;padding:2px 6px;border-radius:0 3px 3px 0'
);
