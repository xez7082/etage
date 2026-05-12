// ═══════════════════════════════════════════════════════════
//  ÉTAGE CARD  v4.3.0 — Design identique à rdc-floor-card
// ═══════════════════════════════════════════════════════════

const E_CATS = [
  {
    key: "temperatures",  label: "Températures", icon: "mdi:thermometer",
    activeLabel: null,       inactiveLabel: null,      activeColor: "#f97316",
    extras: ["hum", "bat"],
  },
  {
    key: "fenetres",      label: "Fenêtres",     icon: "mdi:window-open-variant",
    activeLabel: "ouverte",  inactiveLabel: "fermée",  activeColor: "#38bdf8",
    extras: ["bat"],
  },
  {
    key: "prises",        label: "Prises",       icon: "mdi:power-socket-eu",
    activeLabel: "allumée",  inactiveLabel: "éteinte", activeColor: "#a78bfa",
    extras: [],
  },
  {
    key: "interrupteurs", label: "Lumières",     icon: "mdi:lightbulb-outline",
    activeLabel: "allumée",  inactiveLabel: "éteinte", activeColor: "#fbbf24",
    extras: [],
  },
  {
    key: "volets",        label: "Volets",       icon: "mdi:roller-shade",
    activeLabel: "ouvert",   inactiveLabel: "fermé",   activeColor: "#34d399",
    extras: [],
  },
  {
    key: "fumee",         label: "Sécurité",     icon: "mdi:shield-home-outline",
    activeLabel: "actif",    inactiveLabel: "inactif", activeColor: "#f43f5e",
    extras: ["hum", "bat"],
  },
];

const E_ACTIVE = ["on", "open", "true", "locked", "detected", "motion"];

function ePlural(n, word) { return `${n} ${word}${n > 1 ? "s" : ""}`; }

// ════════════════════════════════════════════════════════════
//  CARTE PRINCIPALE
// ════════════════════════════════════════════════════════════

class EtageCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._tab     = "temperatures";
    this._hass    = null;
    this._cfg     = null;
    this._history = {};
  }

  static getConfigElement() { return document.createElement("etage-card-editor"); }

  static getStubConfig() {
    const out = { title: "Étage" };
    E_CATS.forEach(c => {
      out[c.key] = [];
      out[c.key + "_names"] = [];
      c.extras.forEach(ext => { out[c.key + "_" + ext] = []; });
    });
    return out;
  }

  getCardSize() { return 5; }

  setConfig(c) {
    if (!c) throw new Error("Configuration invalide");
    this._cfg = c;
  }

  set hass(h) {
    this._hass = h;
    if (!this.shadowRoot.querySelector(".card")) {
      this._render();
      this._loadHistory();
    } else {
      this._update();
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  _st(id)  { return this._hass?.states[id] || null; }
  _on(id)  { const s = this._st(id); return s ? E_ACTIVE.includes(s.state.toLowerCase()) : false; }

  _name(key, i) {
    const n  = (this._cfg[key + "_names"] || [])[i];
    const id = (this._cfg[key] || [])[i];
    if (n) return n;
    const st = id ? this._st(id) : null;
    return st?.attributes?.friendly_name || id?.split(".")?.[1] || "—";
  }

  _icon(id, fallback) {
    return this._st(id)?.attributes?.icon || fallback;
  }

  // Stats par catégorie
  _getStats() {
    const out = {};
    E_CATS.forEach(c => {
      const ents = (this._cfg[c.key] || []).filter(e => !!e);
      let active = 0;
      ents.forEach(id => {
        const st = this._hass?.states[id];
        if (!st) return;
        if (c.key === "volets") {
          if ((st.attributes?.current_position ?? 0) > 0) active++;
        } else if (c.activeLabel !== null) {
          if (E_ACTIVE.includes(st.state.toLowerCase())) active++;
        }
      });
      out[c.key] = { active, total: ents.length };
    });
    return out;
  }

  _tabBadgeText(cat, stats) {
    const s = stats[cat.key];
    if (!s || s.total === 0) return "0";
    if (cat.activeLabel === null) return `${s.total}`;
    return `${s.active} / ${s.total}`;
  }

  _headerChipHtml(cat, stats) {
    const s = stats[cat.key];
    if (!s || s.total === 0) return "";
    let text;
    if (cat.activeLabel === null) {
      text = `<span class="chip-val">${ePlural(s.total, "capteur")}</span>`;
    } else if (s.active === 0) {
      text = `<span class="chip-off">${ePlural(s.total, cat.inactiveLabel)}</span>`;
    } else if (s.active === s.total) {
      text = `<span class="chip-on" style="color:${cat.activeColor}">${ePlural(s.active, cat.activeLabel)}</span>`;
    } else {
      text = `<span class="chip-on" style="color:${cat.activeColor}">${s.active} ${cat.activeLabel}${s.active > 1 ? "s" : ""}</span>`
           + `<span class="chip-sep">·</span>`
           + `<span class="chip-off">${s.total - s.active} ${cat.inactiveLabel}${(s.total - s.active) > 1 ? "s" : ""}</span>`;
    }
    return `
      <div class="hchip" data-hchip="${cat.key}">
        <ha-icon icon="${cat.icon}" style="--mdc-icon-size:15px;color:${cat.activeColor}"></ha-icon>
        ${text}
      </div>`;
  }

  // Historique températures
  _loadHistory() {
    const ents = (this._cfg.temperatures || []).filter(e => e);
    if (!ents.length) return;
    const end   = new Date();
    const start = new Date(end - 8 * 3600 * 1000);
    this._hass.callApi("GET",
      `history/period/${start.toISOString()}?filter_entity_id=${ents.join(",")}&minimal_response=true`
    ).then(data => {
      (data || []).forEach(series => {
        if (!series.length) return;
        this._history[series[0].entity_id] = series
          .map(p => parseFloat(p.state)).filter(v => !isNaN(v)).slice(-10);
      });
      this._renderGrid();
    }).catch(() => {});
  }

  // ── Mise à jour légère ────────────────────────────────────

  _update() {
    if (!this._hass || !this.shadowRoot) return;
    const stats = this._getStats();

    // Badges onglets + chips header
    E_CATS.forEach(cat => {
      const badge = this.shadowRoot.querySelector(`[data-badge="${cat.key}"]`);
      if (badge) {
        badge.textContent = this._tabBadgeText(cat, stats);
        badge.classList.toggle("badge-active", stats[cat.key]?.active > 0);
      }
      const chip = this.shadowRoot.querySelector(`[data-hchip="${cat.key}"]`);
      if (chip) chip.outerHTML = this._headerChipHtml(cat, stats);
    });

    // Tuiles du grid courant
    (this._cfg[this._tab] || []).forEach((id, i) => {
      if (!id) return;
      const st   = this._hass.states[id];
      const tile = this.shadowRoot.querySelector(`[data-tileid="${id}"]`);
      if (!tile || !st) return;

      if (this._tab === "temperatures") {
        const v   = parseFloat(st.state);
        const col = v > 25 ? "#f43f5e" : v > 20 ? "#fbbf24" : "#38bdf8";
        const vEl = tile.querySelector(".temp-val");
        if (vEl) { vEl.textContent = `${v}\u00b0C`; vEl.style.color = col; }
        const humId = (this._cfg.temperatures_hum || [])[i];
        const batId = (this._cfg.temperatures_bat || [])[i];
        const humSt = humId ? this._hass.states[humId] : null;
        const batSt = batId ? this._hass.states[batId] : null;
        const hEl = tile.querySelector(".hum-val");
        if (hEl) hEl.textContent = humSt ? humSt.state + "%" : "";
        const bEl = tile.querySelector(".bat-val");
        if (bEl) bEl.textContent = batSt ? batSt.state + "%" : "";
      } else if (this._tab === "volets") {
        const pos = st.attributes?.current_position ?? 0;
        tile.classList.toggle("active", pos > 0);
        const vEl = tile.querySelector(".val");
        if (vEl) vEl.textContent = `${pos}% ouvert`;
      } else if (this._tab === "fumee") {
        const on = E_ACTIVE.includes(st.state.toLowerCase());
        tile.classList.toggle("alert", on);
        const vEl = tile.querySelector(".val");
        if (vEl) vEl.textContent = st.state;
      } else {
        const on = E_ACTIVE.includes(st.state.toLowerCase());
        tile.classList.toggle("active", on);
        const vEl = tile.querySelector(".val");
        if (vEl) vEl.textContent = st.state;
      }
    });
  }

  // ── Grid uniquement (changement d'onglet, post-history) ───

  _renderGrid() {
    const grid = this.shadowRoot.querySelector(".grid");
    if (!grid) return;
    grid.innerHTML = this._gridHtml();

    grid.querySelectorAll("[data-svc]").forEach(btn => {
      btn.onclick = ev => {
        ev.stopPropagation();
        const [domain, service] = btn.dataset.svc.split(".");
        this._hass.callService(domain, service, { entity_id: btn.dataset.eid });
      };
    });

    grid.querySelectorAll("[data-toggle]").forEach(tile => {
      tile.onclick = () => {
        this._hass.callService("homeassistant", "toggle", { entity_id: tile.dataset.toggle });
      };
    });
  }

  // ── HTML des tuiles ───────────────────────────────────────

  _gridHtml() {
    if (!this._hass || !this._cfg) return "";
    const key  = this._tab;
    const ents = this._cfg[key] || [];

    return ents.map((id, i) => {
      if (!id) return "";
      const st   = this._hass.states[id];
      const name = this._name(key, i);
      const on   = this._on(id);

      // ── Températures ───────────────────────────────────────
      if (key === "temperatures") {
        const v       = st ? parseFloat(st.state) : 0;
        const col     = v > 25 ? "#f43f5e" : v > 20 ? "#fbbf24" : "#38bdf8";
        const humId   = (this._cfg.temperatures_hum || [])[i];
        const batId   = (this._cfg.temperatures_bat || [])[i];
        const humSt   = humId ? this._hass.states[humId] : null;
        const batSt   = batId ? this._hass.states[batId] : null;
        const batPct  = batSt ? parseFloat(batSt.state) : null;
        const batIcon = batPct === null ? "mdi:battery-unknown"
          : batPct > 80 ? "mdi:battery"
          : batPct > 60 ? "mdi:battery-80"
          : batPct > 40 ? "mdi:battery-60"
          : batPct > 20 ? "mdi:battery-40"
          : "mdi:battery-20";
        const batColor = (batPct !== null && batPct < 20) ? "#f43f5e" : "#64748b";
        return `
          <div class="tile temp-tile" data-tileid="${id}">
            <div class="temp-name">${name}</div>
            <div class="temp-body">
              <div class="temp-side${batSt ? "" : " temp-side--empty"}">
                <ha-icon icon="${batIcon}" style="--mdc-icon-size:18px;color:${batColor}"></ha-icon>
                <span class="bat-val">${batSt ? batSt.state + "%" : ""}</span>
              </div>
              <div class="temp-center">
                <ha-icon icon="mdi:thermometer" style="--mdc-icon-size:30px;color:${col}"></ha-icon>
                <span class="val temp-val" style="color:${col}">${v}°C</span>
              </div>
              <div class="temp-side${humSt ? "" : " temp-side--empty"}">
                <ha-icon icon="mdi:water-percent" style="--mdc-icon-size:18px;color:#38bdf8"></ha-icon>
                <span class="hum-val">${humSt ? humSt.state + "%" : ""}</span>
              </div>
            </div>
          </div>`;
      }

      // ── Volets ─────────────────────────────────────────────
      if (key === "volets") {
        const pos  = st?.attributes?.current_position ?? 0;
        const icon = this._icon(id, "mdi:roller-shade");
        return `
          <div class="tile ${pos > 0 ? "active" : ""}" data-tileid="${id}">
            <ha-icon icon="${icon}" class="tile-icon"></ha-icon>
            <div class="info">
              <div class="name">${name}</div>
              <div class="val vpos">${pos}% ouvert</div>
              <div class="btn-row">
                <button class="vbtn" data-svc="cover.open_cover"  data-eid="${id}">▲</button>
                <button class="vbtn" data-svc="cover.stop_cover"  data-eid="${id}">■</button>
                <button class="vbtn" data-svc="cover.close_cover" data-eid="${id}">▼</button>
              </div>
            </div>
          </div>`;
      }

      // ── Sécurité (fumée) ───────────────────────────────────
      if (key === "fumee") {
        const humId = (this._cfg.fumee_hum || [])[i];
        const batId = (this._cfg.fumee_bat || [])[i];
        const humSt = humId ? this._hass.states[humId] : null;
        const batSt = batId ? this._hass.states[batId] : null;
        const icon  = this._icon(id, "mdi:smoke-detector");
        return `
          <div class="tile ${on ? "alert" : ""}" data-tileid="${id}">
            <ha-icon icon="${icon}" class="tile-icon"></ha-icon>
            <div class="info">
              <div class="name">${name}</div>
              <div class="val">${st ? st.state : "—"}</div>
              ${(humSt || batSt) ? `
              <div class="pills">
                ${humSt ? `<span class="xpill">💧 ${humSt.state}%</span>` : ""}
                ${batSt ? `<span class="xpill">🔋 ${batSt.state}%</span>` : ""}
              </div>` : ""}
            </div>
          </div>`;
      }

      // ── Fenêtres ───────────────────────────────────────────
      if (key === "fenetres") {
        const batId = (this._cfg.fenetres_bat || [])[i];
        const batSt = batId ? this._hass.states[batId] : null;
        const icon  = this._icon(id, "mdi:window-open-variant");
        return `
          <div class="tile ${on ? "active" : ""}" data-tileid="${id}" data-toggle="${id}">
            <ha-icon icon="${icon}" class="tile-icon"></ha-icon>
            <div class="info">
              <div class="name">${name}</div>
              <div class="val">${st ? st.state : "—"}</div>
              ${batSt ? `<div class="pills"><span class="xpill">🔋 ${batSt.state}%</span></div>` : ""}
            </div>
          </div>`;
      }

      // ── Lumières & Prises ──────────────────────────────────
      const icon = this._icon(id,
        key === "interrupteurs" ? "mdi:lightbulb" : "mdi:power-socket-eu");
      return `
        <div class="tile ${on ? "active" : ""}" data-tileid="${id}" data-toggle="${id}">
          <ha-icon icon="${icon}" class="tile-icon"></ha-icon>
          <div class="info">
            <div class="name">${name}</div>
            <div class="val">${st ? st.state : "—"}</div>
          </div>
        </div>`;
    }).join("");
  }

  // ── Rendu complet ─────────────────────────────────────────

  _render() {
    if (!this._hass || !this._cfg) return;
    const stats = this._getStats();

    const tabsHtml = E_CATS.map(cat => {
      const s         = stats[cat.key];
      const badgeTx   = this._tabBadgeText(cat, stats);
      const hasActive = s?.active > 0;
      return `
        <div class="tab ${this._tab === cat.key ? "active" : ""}" data-tab="${cat.key}">
          <ha-icon icon="${cat.icon}"></ha-icon>
          <span>${this._cfg["label_" + cat.key] || cat.label}</span>
          <span class="badge ${hasActive ? "badge-active" : ""}" data-badge="${cat.key}">${badgeTx}</span>
        </div>`;
    }).join("");

    const headerChips = E_CATS.map(cat => this._headerChipHtml(cat, stats)).join("");

    // ── CSS identique à rdc-floor-card + extensions étage ───
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; width:100%; }
        .card { background:#020617; border-radius:28px; padding:24px; color:white; width:100%; box-sizing:border-box; }

        /* ── Header ── */
        .header { margin-bottom:22px; }
        .title  { font-size:1.8rem; font-weight:800; color:#f8fafc; margin-bottom:10px; }
        .header-chips { display:flex; flex-wrap:wrap; gap:8px; }
        .hchip {
          display:inline-flex; align-items:center; gap:5px;
          background:#1e293b; border-radius:20px; padding:5px 12px;
          font-size:.82rem; font-weight:600;
        }
        .chip-on  { font-weight:700; }
        .chip-off { color:#64748b; }
        .chip-val { color:#94a3b8; }
        .chip-sep { color:#334155; margin:0 1px; }

        /* ── Onglets ── */
        .tabs { display:flex; gap:12px; margin-bottom:25px; overflow-x:auto; padding-bottom:8px; }
        .tab {
          padding:14px 20px; background:#1e293b; border-radius:16px;
          display:flex; align-items:center; gap:10px;
          cursor:pointer; white-space:nowrap; transition:background .2s;
        }
        .tab.active { background:#38bdf8; color:#020617; }
        .tab span   { font-size:1rem; font-weight:700; }
        .badge {
          margin-left:2px; padding:3px 9px;
          background:rgba(255,255,255,.08); border-radius:20px;
          font-size:.78rem; font-weight:700; color:#64748b;
          transition:background .2s, color .2s; min-width:28px; text-align:center;
        }
        .tab.active .badge                { background:rgba(2,6,23,.18); color:#0c4a6e; }
        .badge.badge-active               { background:rgba(245,158,11,.18); color:#fbbf24; }
        .tab.active .badge.badge-active   { background:rgba(2,6,23,.25); color:#92400e; }

        /* ── Grille tuiles ── */
        .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; }
        .tile {
          background:#1e293b; padding:22px; border-radius:20px;
          display:flex; align-items:flex-start; gap:18px; cursor:pointer;
          border:1px solid rgba(255,255,255,.05);
          transition:background .2s, border-color .2s;
        }
        .tile.active { border-color:#f59e0b; background:rgba(245,158,11,.12); }
        .tile.alert  { border-color:#f43f5e; background:rgba(244,63,94,.12); cursor:default; }

        .tile-icon { --mdc-icon-size:32px; color:#6b8aaa; flex-shrink:0; margin-top:2px; }
        .tile.active .tile-icon { color:#f59e0b; }
        .tile.alert  .tile-icon { color:#f43f5e; }

        .info { min-width:0; flex:1; }
        .name {
          font-size:1.15rem; font-weight:600; color:#f1f5f9;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        .val  { font-size:1rem; color:#94a3b8; font-weight:500; text-transform:capitalize; }

        /* ── Tuile température : bat | temp | hum ── */
        .tile.temp-tile {
          flex-direction:column; align-items:stretch; cursor:default; gap:10px;
        }
        .temp-name {
          font-size:1.1rem; font-weight:600; color:#f1f5f9;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        .temp-body {
          display:flex; align-items:center; justify-content:space-between; gap:6px;
        }
        .temp-center {
          display:flex; flex-direction:column; align-items:center; gap:4px; flex:1;
        }
        .temp-val { font-size:2rem; font-weight:800; line-height:1; }
        .temp-side {
          display:flex; flex-direction:column; align-items:center;
          gap:3px; min-width:42px;
        }
        .temp-side--empty { opacity:0; pointer-events:none; }
        .bat-val, .hum-val {
          font-size:.78rem; font-weight:700; color:#64748b;
        }
        .hum-val { color:#38bdf8; }

        /* Volets */
        .vpos { color:#94a3b8; }
        .btn-row { display:flex; gap:6px; margin-top:10px; }
        .vbtn {
          flex:1; background:#0f172a; border:1px solid rgba(255,255,255,.08);
          color:white; padding:8px; border-radius:8px; cursor:pointer;
          font-size:.9rem; transition:background .15s;
        }
        .vbtn:hover { background:#334155; }

        /* Pills extras (hum, bat) */
        .pills { display:flex; flex-wrap:wrap; gap:5px; margin-top:7px; }
        .xpill {
          background:#0f172a; border:1px solid rgba(255,255,255,.08);
          padding:2px 8px; border-radius:10px; font-size:.75rem; color:#64748b;
        }

        /* Scrollbar */
        .tabs::-webkit-scrollbar { height:4px; }
        .tabs::-webkit-scrollbar-thumb { background:#334155; border-radius:10px; }
      </style>
      <div class="card">
        <div class="header">
          <div class="title">${this._cfg.title || "Étage"}</div>
          <div class="header-chips">${headerChips}</div>
        </div>
        <div class="tabs">${tabsHtml}</div>
        <div class="grid"></div>
      </div>`;

    // Listeners onglets
    this.shadowRoot.querySelectorAll(".tab").forEach(t => {
      t.onclick = () => {
        this._tab = t.dataset.tab;
        this.shadowRoot.querySelectorAll(".tab").forEach(x => {
          x.classList.toggle("active", x.dataset.tab === this._tab);
        });
        this._renderGrid();
      };
    });

    this._renderGrid();
  }
}

// ════════════════════════════════════════════════════════════
//  ÉDITEUR VISUEL  (même style dark que la carte)
// ════════════════════════════════════════════════════════════

class EtageCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._tab  = "temperatures";
    this._hass = null;
    this._cfg  = null;
  }

  set hass(h) {
    this._hass = h;
    this.shadowRoot.querySelectorAll("ha-entity-picker").forEach(p => { p.hass = h; });
  }

  setConfig(c) {
    this._cfg = this._clean(c);
    this._render();
  }

  _clean(cfg) {
    const out = JSON.parse(JSON.stringify(cfg || {}));
    E_CATS.forEach(c => {
      if (!Array.isArray(out[c.key]))             out[c.key]             = [];
      if (!Array.isArray(out[c.key + "_names"])) out[c.key + "_names"] = [];
      c.extras.forEach(ext => {
        if (!Array.isArray(out[c.key + "_" + ext])) out[c.key + "_" + ext] = [];
      });
    });
    return out;
  }

  _fire() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._cfg }, bubbles: true, composed: true,
    }));
  }

  _render() {
    if (!this._cfg) return;
    const cat  = E_CATS.find(c => c.key === this._tab);
    const ents = this._cfg[cat.key] || [];

    const tabBtns = E_CATS.map(c => {
      const count = (this._cfg[c.key] || []).filter(e => !!e).length;
      return `
        <button class="etab ${this._tab === c.key ? "active" : ""}" data-tab="${c.key}">
          <ha-icon icon="${c.icon}" style="--mdc-icon-size:18px"></ha-icon>
          <span>${c.label}</span>
          ${count > 0 ? `<span class="ecount">${count}</span>` : ""}
        </button>`;
    }).join("");

    const rows = ents.map((e, i) => {
      const name = (this._cfg[cat.key + "_names"] || [])[i] || "";
      const extRows = cat.extras.length ? `<div class="ext-block">` + cat.extras.map(ext => `
        <div class="ext-row">
          <span></span>
          <span class="ext-lbl">${ext === "hum" ? "💧 Humidité" : "🔋 Batterie"}</span>
          <div class="picker-wrap" data-k="${cat.key}_${ext}" data-index="${i}"></div>
        </div>`).join("") + `</div>` : "";
      return `
        <div class="erow">
          <span class="enum">${i + 1}</span>
          <input class="ename" type="text" placeholder="Nom…"
            value="${name.replace(/"/g, "&quot;")}"
            data-k="${cat.key}_names" data-index="${i}" />
          <div class="picker-wrap" data-k="${cat.key}" data-index="${i}"></div>
          <button class="del-btn" data-index="${i}">
            <ha-icon icon="mdi:delete-outline"></ha-icon>
          </button>
        </div>
        ${extRows}`;
    }).join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; font-family:var(--primary-font-family,sans-serif); }

        /* ── Onglets éditeur ── */
        .etabs {
          display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;
        }
        .etab {
          display:flex; align-items:center; gap:6px;
          padding:8px 14px; border:1px solid var(--divider-color,#e0e0e0);
          border-radius:20px; background:transparent; cursor:pointer;
          color:var(--primary-text-color); font-size:.88rem; font-weight:600;
          transition:background .15s, border-color .15s;
        }
        .etab:hover { background:var(--secondary-background-color,#f5f5f5); }
        .etab.active {
          background:var(--primary-color,#03a9f4);
          border-color:var(--primary-color,#03a9f4); color:#fff;
        }
        .ecount {
          background:var(--primary-color,#03a9f4); color:#fff;
          font-size:.7rem; font-weight:700; padding:1px 7px; border-radius:20px;
        }
        .etab.active .ecount { background:rgba(255,255,255,.3); }

        /* ── Inputs ── */
        .section-title {
          font-size:.72rem; font-weight:700; letter-spacing:.09em;
          text-transform:uppercase; color:var(--secondary-text-color,#888);
          margin-bottom:10px;
        }
        .full-input {
          width:100%; box-sizing:border-box; padding:10px 14px;
          background:var(--card-background-color,#fff);
          border:1px solid var(--divider-color,#e0e0e0);
          border-radius:10px; font-size:1rem;
          color:var(--primary-text-color,#212121); outline:none;
          margin-bottom:14px;
        }
        .full-input:focus { border-color:var(--primary-color,#03a9f4); }
        .rename-row { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
        .rename-prefix { font-size:.82rem; color:var(--secondary-text-color,#888); white-space:nowrap; }
        .rename-input {
          flex:1; padding:8px 12px;
          background:var(--card-background-color,#fff);
          border:1px solid var(--divider-color,#e0e0e0);
          border-radius:8px; font-size:.9rem;
          color:var(--primary-text-color,#212121); outline:none;
        }
        .rename-input:focus { border-color:var(--primary-color,#03a9f4); }
        hr { border:none; border-top:1px solid var(--divider-color,#e0e0e0); margin:14px 0; }

        /* ── Lignes entités ── */
        .erow {
          display:grid; grid-template-columns:22px 1fr 1.6fr 32px;
          gap:7px; align-items:center; margin-bottom:6px;
        }
        .ext-row {
          display:grid; grid-template-columns:22px 110px 1fr;
          gap:7px; align-items:center;
          margin-bottom:8px; padding:6px 8px;
          background:var(--secondary-background-color,rgba(0,0,0,.03));
          border-radius:8px;
          border-left:3px solid var(--primary-color,#03a9f4);
        }
        .enum    { font-size:.78rem; color:var(--secondary-text-color,#888); text-align:center; }
        .ext-lbl {
          font-size:.78rem; font-weight:700;
          color:var(--primary-color,#03a9f4); white-space:nowrap;
        }
        .ename {
          padding:8px 10px;
          background:var(--card-background-color,#fff);
          border:1px solid var(--divider-color,#e0e0e0);
          border-radius:8px; font-size:.88rem;
          color:var(--primary-text-color,#212121); outline:none; width:100%; box-sizing:border-box;
        }
        .ename:focus { border-color:var(--primary-color,#03a9f4); }
        .picker-wrap { min-width:0; }
        .del-btn {
          background:transparent; border:none; cursor:pointer;
          color:var(--error-color,#f44336); padding:5px; border-radius:6px;
          display:flex; align-items:center; transition:background .15s;
        }
        .del-btn:hover { background:rgba(244,67,54,.1); }
        .del-btn ha-icon { --mdc-icon-size:18px; }
        .ext-block {
          margin-bottom:12px; margin-top:2px;
          border-radius:8px; overflow:hidden;
        }
        .ext-block .ext-row:last-child { margin-bottom:0; }
        .add-btn {
          display:flex; align-items:center; justify-content:center; gap:8px;
          width:100%; padding:10px; margin-top:6px;
          border:1.5px dashed var(--primary-color,#03a9f4); border-radius:10px;
          background:transparent; cursor:pointer;
          color:var(--primary-color,#03a9f4); font-size:.92rem; font-weight:600;
          transition:background .15s;
        }
        .add-btn:hover { background:rgba(3,169,244,.07); }
        .add-btn ha-icon { --mdc-icon-size:20px; }
        .count-badge {
          display:inline-block; margin-left:6px;
          background:var(--primary-color,#03a9f4); color:#fff;
          font-size:.7rem; font-weight:700; padding:1px 7px;
          border-radius:20px; vertical-align:middle;
        }
      </style>

      <div class="section-title">Titre de la carte</div>
      <input id="card-title" class="full-input" type="text"
        placeholder="Étage"
        value="${(this._cfg.title || "").replace(/"/g, "&quot;")}" />

      <hr />

      <div class="section-title">Catégorie</div>
      <div class="etabs">${tabBtns}</div>
      <div class="rename-row">
        <span class="rename-prefix">Renommer l'onglet :</span>
        <input id="tab-label" class="rename-input" type="text"
          placeholder="${cat.label}"
          value="${(this._cfg["label_" + this._tab] || "").replace(/"/g, "&quot;")}" />
      </div>

      <hr />

      <div class="section-title">
        Entités — ${this._cfg["label_" + this._tab] || cat.label}
        <span class="count-badge">${ents.length}</span>
      </div>
      <div id="entity-list">${rows}</div>
      <button class="add-btn" id="add-btn">
        <ha-icon icon="mdi:plus-circle-outline"></ha-icon>
        Ajouter une entité
      </button>`;

    // Injecter ha-entity-picker
    this.shadowRoot.querySelectorAll(".picker-wrap").forEach(wrap => {
      const { k, index } = wrap.dataset;
      const idx    = parseInt(index, 10);
      const val    = (this._cfg[k] || [])[idx] || "";
      const picker = document.createElement("ha-entity-picker");
      picker.hass  = this._hass;
      picker.value = val;
      picker.allowCustomEntity = false;
      picker.style.cssText = "display:block;width:100%;";
      picker.addEventListener("value-changed", ev => {
        ev.stopPropagation();
        if (!this._cfg[k]) this._cfg[k] = [];
        this._cfg[k][idx] = ev.detail.value;
        this._fire();
      });
      wrap.appendChild(picker);
    });

    // Titre carte
    this.shadowRoot.getElementById("card-title").addEventListener("input", ev => {
      this._cfg = { ...this._cfg, title: ev.target.value };
      this._fire();
    });

    // Rename onglet
    this.shadowRoot.getElementById("tab-label").addEventListener("input", ev => {
      this._cfg = { ...this._cfg, ["label_" + this._tab]: ev.target.value };
      this._fire();
    });

    // Switch onglet
    this.shadowRoot.querySelectorAll(".etab").forEach(btn => {
      btn.addEventListener("click", () => { this._tab = btn.dataset.tab; this._render(); });
    });

    // Noms
    this.shadowRoot.querySelectorAll(".ename").forEach(inp => {
      inp.addEventListener("input", ev => {
        const k   = ev.target.dataset.k;
        const idx = parseInt(ev.target.dataset.index, 10);
        if (!this._cfg[k]) this._cfg[k] = [];
        this._cfg[k][idx] = ev.target.value;
        this._fire();
      });
    });

    // Supprimer (nettoie aussi les extras)
    this.shadowRoot.querySelectorAll(".del-btn").forEach(btn => {
      btn.addEventListener("click", ev => {
        ev.stopPropagation();
        const idx  = parseInt(btn.dataset.index, 10);
        const keys = [cat.key, cat.key + "_names", ...cat.extras.map(ext => cat.key + "_" + ext)];
        keys.forEach(k => {
          if (Array.isArray(this._cfg[k])) {
            const l = [...this._cfg[k]]; l.splice(idx, 1); this._cfg[k] = l;
          }
        });
        this._fire(); this._render();
      });
    });

    // Ajouter
    this.shadowRoot.getElementById("add-btn").addEventListener("click", () => {
      this._cfg[cat.key] = [...(this._cfg[cat.key] || []), ""];
      this._fire(); this._render();
      setTimeout(() => {
        const ps = this.shadowRoot.querySelectorAll("ha-entity-picker");
        ps[ps.length - 1 - cat.extras.length]?.focus?.();
      }, 60);
    });
  }
}

// ════════════════════════════════════════════════════════════
//  ENREGISTREMENT
// ════════════════════════════════════════════════════════════

customElements.define("etage-card",        EtageCard);
customElements.define("etage-card-editor", EtageCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type:        "etage-card",
  name:        "Étage Card",
  description: "Carte multi-onglets pour l'étage",
  preview:     false,
});
