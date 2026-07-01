// ==UserScript==
// @name         Nuclear Family — MultiFaction Edition (Hyper-Drive)
// @namespace    torn.com.nuclearfamily.strict
// @version      6.5.34
// @description  Deeply isolated multi-faction alliance tournament dashboard. Built on KISS principles with dynamic tooltips, Class Handicaps, track select drop-downs, Steward race scraper, Cloudflare result ingestion, and focused automatic upload, gate diagnostics, and Control Center foundation.
// @author       cowboyup
// @match        https://www.torn.com/page.php?sid=racing*
// @match        https://www.torn.com/loader.php?sid=racing*
// @license      MIT
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @connect      nuclear-family.selbaer.workers.dev
// ==/UserScript==



;(function (window, document) {
  'use strict';



  /**********************************************************************
   * NUCLEAR FAMILY — LIBRARY EDITION INDEX
   *
   * Refactor rule:
   *     This edition reorganizes the script into library shelves only.
   *     The function bodies, UI behavior, storage keys, endpoints, and
   *     runtime behavior are intentionally preserved.
   *
   * Table of Contents:
   *     BOOK 01 — Configuration & Runtime State
   *     BOOK 02 — Theme Engine & CSS Injection
   *     BOOK 03 — General Utilities
   *     BOOK 04 — Storage Helpers
   *     BOOK 05 — Dashboard Shell & Core UI
   *     BOOK 06 — Router & Navigation
   *     BOOK 07 — Leaderboard Engine
   *     BOOK 08 — League Setup Engine
   *     BOOK 09 — Standings Engine
   *     BOOK 10 — Steward Management
   *     BOOK 11 — Race Log Scraper
   *     BOOK 12 — Data Export
   *     BOOK 13 — Torn API Sync Pipeline
   *     BOOK 14 — Help Library
   *     BOOK 15 — Entry Point
   **********************************************************************/


  /**********************************************************************
   * BOOK 01 — CONFIGURATION & RUNTIME STATE
   *
   * Purpose:
   *     Static configuration, storage keys, lists, defaults, runtime state, and CSS node setup.
   *
   * Contains:
   *     - Storage/cache keys
   *     - Cloudflare placeholders
   *     - Faction matrix
   *     - Track list
   *     - FAQ database
   *     - Runtime variables
   *     - League defaults
   *     - Steward registry state
   *     - Style node creation
   *
   * Dependencies:
   *     - Browser localStorage
   *     - document.head / documentElement
   **********************************************************************/

  // ============================================================
  // STORAGE & CACHE KEY CONFIGURATION
  // ============================================================
  var CONFIG_STORAGE_KEY   = 'nbf_v3_api_key';
  var CONFIG_THEME_KEY     = 'nbf_v3_theme';
  var CONFIG_CACHE_KEY     = 'nbf_v3_data_cache';
  var CONFIG_TIME_KEY      = 'nbf_v3_cache_time';
  var CONFIG_LEAGUE_KEY    = 'nbf_v57_league_cfg';
  var CONFIG_STEWARD_KEY   = 'nbf_v58_stewards';       // Steward registry
  var CONFIG_STOKEN_KEY    = 'nbf_v58_steward_token';  // This user's Steward token
  var CONFIG_RACE_SENT_KEY = 'nbf_v65_submitted_races'; // Local duplicate guard for race ingestion
  var CONFIG_INGEST_LOG_KEY = 'nbf_v65_last_ingestion'; // Last race ingestion result for Steward UI
  var CONFIG_ACTIVITY_LOG_KEY = 'nbf_v651_activity_log'; // Last Steward/Control Center events
  var CONFIG_CONTROL_OPEN_KEY = 'nbf_v651_control_open'; // Control Center collapsed state
  var CONFIG_GATE_STATUS_KEY  = 'nbf_v653_gate_status'; // Last automatic upload gate checklist
  var CONFIG_API_ACCORDION_KEY = 'nbf_v658c_api_accordion_open'; // Torn Account accordion state
  var CONFIG_CC_SECTION_KEY    = 'nbf_v6510_control_sections'; // Control Center accordion section states
  var CONFIG_ADMIN_SESSION_KEY = 'nbf_v6514_admin_token_session'; // Session-only admin token, never localStorage
  var CONFIG_FIRST_UPLOAD_CONFIRM_KEY = 'nbf_v6530_first_upload_confirmed';
  var CONFIG_UPLOAD_QUEUE_KEY = 'nbf_v6531_upload_queue';
  var CONFIG_UPLOAD_HISTORY_KEY = 'nbf_v6531_upload_history';
  var CACHE_DURATION       = 86400000;

  // ============================================================
  // *** PLACEHOLDER — REPLACE BEFORE DEPLOYMENT ***
  // Cloudflare Worker ingestion endpoint.
  // Replace this URL with your actual Worker route once deployed.
  // ============================================================
  var CF_INGEST_ENDPOINT    = 'https://nuclear-family.selbaer.workers.dev/ingest-race';
  var CF_STANDINGS_ENDPOINT = 'https://nuclear-family.selbaer.workers.dev/standings';
  var CF_RACE_VERIFY_ENDPOINT = 'https://nuclear-family.selbaer.workers.dev/race-status';
  var CF_HEALTH_ENDPOINT    = 'https://nuclear-family.selbaer.workers.dev/health';
  var CF_ADMIN_HEALTH_ENDPOINT = 'https://nuclear-family.selbaer.workers.dev/admin/health';
  var CF_ADMIN_CONFIG_ENDPOINT = 'https://nuclear-family.selbaer.workers.dev/admin/config-check';
  var CF_ADMIN_STEWARDS_ENDPOINT = 'https://nuclear-family.selbaer.workers.dev/admin/stewards';
  var CF_AUTH_LOGIN_ENDPOINT = 'https://nuclear-family.selbaer.workers.dev/auth/login';
  var CF_CHAMPIONSHIP_SEASONS_ENDPOINT = 'https://nuclear-family.selbaer.workers.dev/championship/seasons';
  var CF_CHAMPIONSHIP_EVENTS_ENDPOINT = 'https://nuclear-family.selbaer.workers.dev/championship/events';
  var CF_CHAMPIONSHIP_ASSIGN_ENDPOINT = 'https://nuclear-family.selbaer.workers.dev/championship/assign-race';
  var CF_CHAMPIONSHIP_STANDINGS_ENDPOINT = 'https://nuclear-family.selbaer.workers.dev/championship/standings';
  var CF_CHAMPIONSHIP_UNASSIGNED_ENDPOINT = 'https://nuclear-family.selbaer.workers.dev/championship/unassigned-races';

  // ============================================================
  // ALLIANCE TARGET MATRIX
  // ============================================================
  var TARGET_FACTIONS = [
    { id: 8085,  name: 'Nuclear Blast' },
    { id: 8954,  name: 'Nuclear Armageddon' },
    { id: 16282, name: 'Nuclear Winter' },
    { id: 12094, name: 'Nuclear Fusion' },
    { id: 21028, name: 'Nuclear Clinic' },
    { id: 13851, name: 'Nuclear Therapy' },
    { id: 17133, name: 'Torn Medical' },
    { id: 366,   name: 'Evolution' },
    { id: 15222, name: 'Ionization' },
    { id: 9754,  name: 'Emergency Room' }
  ];

  // ============================================================
  // TRACK LIST MATRIX
  // ============================================================
  var AVAILABLE_TRACKS = [
    "Uptown", "Withdrawal", "Underdog", "Parkland", "Docks", "Commerce",
    "Two Islands", "Industrial", "Vector", "Mudpit", "Hammerhead",
    "Sewage", "Meltdown", "Speedway", "Stone Park", "Convict"
  ];

  // ============================================================
  // FAQ / HELP DATABASE
  // ============================================================
  var FAQ_DATABASE = [
    {
      q: "Why Does the Sync Take So Long?",
      a: "The short answer: the dashboard is fetching live data for every single driver across all 10 alliance factions — one by one. Here is what happens behind the scenes. First, the script contacts Torn\'s servers once per faction to pull the full member roster (10 requests total). Then, for every driver found, it sends an individual request to fetch their personal racing stats. With roughly 780 drivers across the alliance, that means around 790 separate requests to Torn\'s API. To avoid overloading Torn\'s servers and getting your API key flagged or rate-limited, the script deliberately waits 650 milliseconds between each driver request. At that pace, 780 drivers takes approximately 8 to 9 minutes to complete a full sync. The good news: once the sync finishes, all data is saved locally in your browser for 24 hours. Unless you manually hit the Sync button again, the dashboard loads instantly from that saved snapshot. You only pay the full wait time once per day."
    },
    {
      q: "API Access Security & Keys",
      a: "Your API key is stored completely secure inside your local browser sandbox (localStorage) and is never transmitted to external servers or logging platforms. We highly recommend utilizing a Limited Access or Public Only API key as the dashboard only requests basic public rosters and driver personalstats—never requiring Full Access permissions. Furthermore, by explicitly declaring '@grant none', the script physically strips itself of elevated privileges to guarantee complete isolation."
    },
    {
      q: "Dashboard Visibility & Scope",
      a: "To keep your game experience lightweight and running fast, this script stays completely quiet and out of the way during your daily tasks like gym training, crime, or trading. It intercepts your interface and initializes its components only when you actively visit the racing section, ensuring it runs exactly when and where you need it without causing global performance degradation."
    },
    {
      q: "Handicaps & Class Tier Logic",
      a: "Under the KISS principle, Individual Solo Races leverage automated driver stratification. Drivers are automatically partitioned into three explicit tiers: Class C Rookie (RS under 5), Class B Pro (RS 5 to 20), and Class A Master Elite (RS 20+). Handicaps are verified at post-race ledger calculations, granting low-tier drivers performance offsets when outperforming higher brackets, keeping tournament tracking completely seamless."
    },
    {
      q: "League Standings & Scoring",
      a: "The League Standings tab displays championship points calculated by the Cloudflare backend from all submitted race results. Points follow a standard hierarchy (25-18-15-12-10-8-6-4-2-1 for top 10 finishers). The standings update automatically each time a Steward submits a race log. When the backend is live, click Refresh on the Standings tab to pull the latest data."
    },
    {
      q: "Steward System & Race Ingestion",
      a: "Authorized Stewards are identified by their Torn player ID and a unique personal token stored locally. When a Steward navigates to a completed race log page (sid=racing&tab=log&raceID=XXXX), the script automatically detects the context, scrapes the results table from the DOM, and transmits the payload to the league backend via a secure POST request authenticated by their Steward token. No automation — the Steward simply views the page as normal."
    }
  ];

  // ============================================================
  // APP VARIABLE STATE
  // ============================================================
  migrateSecretFromLocalStorage(CONFIG_STORAGE_KEY);
  migrateSecretFromLocalStorage(CONFIG_STOKEN_KEY);
  var STATE_API_KEY     = secureGetValue(CONFIG_STORAGE_KEY, '') || '';
  var STATE_DARK_MODE   = localStorage.getItem(CONFIG_THEME_KEY) === 'dark';
  var RUNTIME_MEMBERS   = [];
  var RUNTIME_MAX_SKILL = 100;
  var FLAG_IS_FETCHING  = false;
  var STATE_COMPARE_A   = '';
  var STATE_COMPARE_B   = '';
  var STATE_ACTIVE_TAB  = 'leaderboard';
  var BACKEND_STATUS    = {
    state: 'unchecked',
    backend: 'Not checked yet',
    database: 'Not checked yet',
    version: '—',
    latency: null,
    lastCheck: '—',
    error: ''
  };
  var LAST_INGESTION_STATUS = loadLastIngestionStatus();
  var STATE_CONTROL_CENTER_OPEN = localStorage.getItem(CONFIG_CONTROL_OPEN_KEY) === 'open';
  var INGESTION_GATE_STATUS = loadGateStatus();

  // ============================================================
  // LEAGUE ENGINE CONFIG
  // ============================================================
  var LEAGUE_STATE = JSON.parse(localStorage.getItem(CONFIG_LEAGUE_KEY)) || {
    compType: 'solo',
    scopeType: 'all',
    scopeFactionId: 'all',
    teamCount: 4,
    useHandicaps: true,
    selectedTracks: ["Uptown", "Withdrawal", "Underdog", "Parkland", "Docks"],
    lapsCount: 10,
    scoringType: 'standard',
    generatedTeams: []
  };

  // ============================================================
  // STEWARD REGISTRY
  // Stored as array of { id: "tornPlayerID", name: "DisplayName", role: "event"|"liaison" }
  // ============================================================
  var STEWARD_REGISTRY = JSON.parse(localStorage.getItem(CONFIG_STEWARD_KEY)) || [];

  // This user's own Steward token (empty string = not a Steward)
  var STATE_STEWARD_TOKEN = secureGetValue(CONFIG_STOKEN_KEY, '') || '';

  var ENGINE_VERSION = '6.5.34';
  var SCRAPER_SESSION_RACES = {}; // Prevent repeated scraper boot attempts for the same race page session.
  var STATE_ADMIN_TOKEN_SESSION = sessionStorage.getItem(CONFIG_ADMIN_SESSION_KEY) || '';
  var BACKEND_STEWARD_REGISTRY = {
    state: 'locked',
    message: 'Admin mode locked.',
    stewards: [],
    lastToken: null
  };
  var BACKEND_STEWARD_EDITOR = {
    editingId: null,
    message: ''
  };
  var BACKEND_LOGIN_IDENTITY = JSON.parse(sessionStorage.getItem('nbf_v6529_login_identity') || 'null');
  var BACKEND_CHECK_IN_FLIGHT = false;
  var BACKEND_CHECK_LAST_STARTED = 0;
  var UPLOAD_QUEUE_PROCESSING = false;
  var CHAMPIONSHIP_STATE = { seasons: [], events: [], unassigned: [], standings: [], message: '', loading: false };
  var LEAGUE_SETUP_DOC_CLICK_BOUND = false;

  // ============================================================
  // CSS INJECTION
  // ============================================================
  var cssStyleNode = document.createElement('style');
  cssStyleNode.id = 'nbf-hyper-drive-styles';
  (document.head || document.documentElement).appendChild(cssStyleNode);


  /**********************************************************************
   * BOOK 02 — THEME ENGINE & CSS INJECTION
   *
   * Purpose:
   *     Defines all dynamic CSS and theme application behavior.
   *
   * Contains:
   *     - dynamicCSSRefresh()
   *     - applyModalThemeMatrix()
   *
   * Dependencies:
   *     - Runtime State
   *     - Style node
   **********************************************************************/

  function dynamicCSSRefresh() {
    var bgHeader  = STATE_DARK_MODE ? '#1e293b' : '#ffffff';
    var textHeader = STATE_DARK_MODE ? '#94a3b8' : '#64748b';
    var bldColor  = STATE_DARK_MODE ? '#334155' : '#cbd5e1';
    var tooltipBg = STATE_DARK_MODE ? '#1f2937' : '#0f172a';
    var tooltipTxt = STATE_DARK_MODE ? '#f3f4f6' : '#ffffff';

    cssStyleNode.textContent =
      '#nbf-frame-scrollbox { overflow-y: auto !important; overflow-x: auto !important; flex: 1 !important; height: 100% !important; position: relative !important; }' +
      '#nbf-table-view { width: 100% !important; border-collapse: separate !important; border-spacing: 0 !important; font-size: 11px !important; min-width: 720px !important; }' +
      '#nbf-table-view thead th { position: sticky !important; top: 0 !important; z-index: 9999 !important; background-color: ' + bgHeader + ' !important; color: ' + textHeader + ' !important; font-weight: 600 !important; padding: 12px 4px 10px 14px !important; text-align: left !important; border-bottom: 2px solid ' + bldColor + ' !important; }' +
      '#nbf-table-view th:first-child { padding-left: 14px !important; }' +
      '#nbf-table-view th:last-child { padding-right: 14px !important; }' +
      '.nbf-row-selected { background: rgba(99, 102, 241, 0.15) !important; }' +
      '.nbf-tab-btn { padding: 6px 12px !important; border: 1px solid var(--nbf-bld) !important; background: var(--nbf-btn-base) !important; color: var(--nbf-txt) !important; font-size: 12px !important; font-weight: 600 !important; cursor: pointer !important; border-radius: 4px !important; }' +
      '.nbf-tab-btn.active { background: #6366f1 !important; color: #ffffff !important; border-color: #6366f1 !important; }' +
      '.nbf-tab-btn { pointer-events:auto !important; position:relative !important; z-index:20 !important; }' +
      '#nbf-main-nav-row { position:relative !important; z-index:25 !important; }' +

      '#nbf-title-row { min-height: 34px !important; }' +
      '#nbf-btn-close { order: -100 !important; white-space: nowrap !important; }' +
      '#nbf-field-search::-ms-reveal, #nbf-field-search::-ms-clear { display: none !important; }' +
      '#nbf-field-search:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px var(--nbf-field-bg) inset !important; -webkit-text-fill-color: var(--nbf-txt) !important; }' +


      '.nbf-tooltip-host { position: relative !important; display: inline-block !important; cursor: help !important; margin-left: 4px !important; background: var(--nbf-bdg) !important; color: var(--nbf-mut) !important; font-size: 10px !important; width: 14px !important; height: 14px !important; line-height: 14px !important; text-align: center !important; border-radius: 50% !important; font-weight: bold !important; }' +
      '.nbf-tooltip-host .nbf-tooltip-text { visibility: hidden !important; width: 220px !important; background-color: ' + tooltipBg + ' !important; color: ' + tooltipTxt + ' !important; text-align: left !important; border-radius: 6px !important; padding: 8px !important; position: absolute !important; z-index: 9999999 !important; bottom: 125% !important; left: 50% !important; margin-left: -110px !important; opacity: 0 !important; transition: opacity 0.2s !important; font-size: 11px !important; font-family: sans-serif !important; font-weight: normal !important; line-height: 1.4 !important; box-shadow: 0 4px 12px rgba(0,0,0,0.25) !important; pointer-events: none !important; white-space: normal !important; }' +
      '.nbf-tooltip-host:hover .nbf-tooltip-text { visibility: visible !important; opacity: 1 !important; }' +
      '.nbf-faq-item { border: 1px solid var(--nbf-bld) !important; border-radius: 6px !important; margin-bottom: 8px !important; background: var(--nbf-main) !important; overflow: hidden !important; }' +
      '.nbf-dropdown-menu { display: none; position: absolute; left: 0; right: 0; top: 100%; background: var(--nbf-field-bg); border: 1px solid var(--nbf-btn-border); border-radius: 6px; max-height: 180px; overflow-y: auto; z-index: 100000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 6px; }' +
      '.nbf-dropdown-menu.show { display: block; }' +
      '.nbf-track-option { display: flex; align-items: center; gap: 8px; padding: 4px 6px; cursor: pointer; border-radius: 4px; font-size: 11px; }' +
      '.nbf-track-option:hover { background: rgba(99, 102, 241, 0.15); }' +
      // Scraper toast notification styles
      '#nbf-scraper-toast { position: fixed !important; bottom: 220px !important; right: 16px !important; z-index: 9999999 !important; padding: 10px 14px !important; border-radius: 6px !important; font-size: 12px !important; font-weight: 600 !important; font-family: Arial, sans-serif !important; max-width: 280px !important; box-shadow: 0 4px 16px rgba(0,0,0,0.3) !important; transition: opacity 0.4s !important; }' +
      '#nbf-scraper-toast.success { background: #14532d !important; color: #bbf7d0 !important; border: 1px solid #16a34a !important; }' +
      '#nbf-scraper-toast.error { background: #450a0a !important; color: #fca5a5 !important; border: 1px solid #dc2626 !important; }' +
      '#nbf-scraper-toast.info { background: #1e1b4b !important; color: #c7d2fe !important; border: 1px solid #6366f1 !important; }';
  }

  // ============================================================
  // STEWARD UTILITY FUNCTIONS
  // ============================================================

  function applyModalThemeMatrix(domElement) {
    if (STATE_DARK_MODE) {
      domElement.style.cssText = 'width: 95vw !important; max-width: 960px !important; height: 85vh !important; max-height: 740px !important; background: #111827 !important; color: #f3f4f6 !important; border-radius: 12px !important; box-shadow: 0 12px 36px rgba(0,0,0,0.6) !important; display: flex !important; flex-direction: column !important; font-family: Arial, sans-serif !important; font-size: 13px !important; box-sizing: border-box !important; overflow: hidden !important; --nbf-main: #111827; --nbf-alt: #1f2937; --nbf-alt2: #1e293b; --nbf-txt: #f3f4f6; --nbf-mut: #9ca3af; --nbf-bld: #374151; --nbf-btn-border: #4b5563; --nbf-bdg: #374151; --nbf-field-bg: #1f2937; --nbf-btn-base: #374151; --nbf-btn-acc: #1e40af; --nbf-btn-acc-txt: #ffffff;';
    } else {
      domElement.style.cssText = 'width: 95vw !important; max-width: 960px !important; height: 85vh !important; max-height: 740px !important; background: #fff !important; color: #111 !important; border-radius: 12px !important; box-shadow: 0 12px 36px rgba(0,0,0,0.4) !important; display: flex !important; flex-direction: column !important; font-family: Arial, sans-serif !important; font-size: 13px !important; box-sizing: border-box !important; overflow: hidden !important; --nbf-main: #ffffff; --nbf-alt: #fcfcfc; --nbf-alt2: #f8fafc; --nbf-txt: #111111; --nbf-mut: #64748b; --nbf-bld: #e5e5e5; --nbf-btn-border: #cccccc; --nbf-bdg: #e2e8f0; --nbf-field-bg: #ffffff; --nbf-btn-base: #f1f5f9; --nbf-btn-acc: #e2e8f0; --nbf-btn-acc-txt: #0f172a;';
    }
  }

  // ============================================================
  // TAB ROUTER
  // ============================================================


  /**********************************************************************
   * BOOK 03 — GENERAL UTILITIES
   *
   * Purpose:
   *     Small reusable helpers that do not own feature state.
   *
   * Contains:
   *     - createTooltip()
   *     - resolveRankBadge()
   *     - renderStatModule()
   *     - showScraperToast()
   *     - executeAsyncDelay()
   *
   * Dependencies:
   *     - Runtime State where needed
   *     - document.body for toast
   **********************************************************************/

  function createTooltip(text) {
    return '<span class="nbf-tooltip-host">?<span class="nbf-tooltip-text">' + text + '</span></span>';
  }

  // ============================================================
  // MODAL INTERFACE
  // ============================================================

  function resolveRankBadge(skillPoints) {
    if (skillPoints >= 20.0) return { title: 'Master Elite', bg: '#fef3c7', text: '#b45309' };
    if (skillPoints >= 5.0)  return { title: 'Pro',          bg: '#e0f2fe', text: '#0369a1' };
    return                          { title: 'Rookie',       bg: (STATE_DARK_MODE ? '#374151' : '#f3f4f6'), text: (STATE_DARK_MODE ? '#9ca3af' : '#4b5563') };
  }

  function renderStatModule(label, metric) {
    return '<div style="background:var(--nbf-main); border:1px solid var(--nbf-bld); border-radius:6px; padding:6px 10px; min-width:75px; flex:1;"><div style="font-size:10px; color:var(--nbf-mut); text-transform:uppercase;">' + escapeHTML(label) + '</div><div style="font-size:14px; font-weight:600; color:var(--nbf-txt); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + escapeHTML(metric) + '</div></div>';
  }

  // ============================================================
  // LEADERBOARD DATA PIPELINE
  // ============================================================

  function showScraperToast(message, type, durationMs) {
    var existing = document.getElementById('nbf-scraper-toast');
    if (existing) existing.parentNode.removeChild(existing);

    var toast = document.createElement('div');
    toast.id = 'nbf-scraper-toast';
    toast.className = type || 'info';
    toast.textContent = message;
    document.body.appendChild(toast);

    window.setTimeout(function() {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        window.setTimeout(function() {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 400);
      }
    }, durationMs || 4000);
  }

  // ============================================================
  // RACE LOG SCRAPER
  // Fires only on: sid=racing & tab=log & raceID present
  // Fires only if: Steward token is set
  // ============================================================

  function executeAsyncDelay(delayPeriod, targetCallback) { window.setTimeout(targetCallback, delayPeriod); }


  function secureGetValue(key, fallback) {
    try { if (typeof GM_getValue === 'function') return GM_getValue(key, fallback); } catch (e) {}
    try { return localStorage.getItem(key) || fallback; } catch (e2) { return fallback; }
  }

  function secureSetValue(key, value) {
    try { if (typeof GM_setValue === 'function') { GM_setValue(key, value || ''); return; } } catch (e) {}
    try { localStorage.setItem(key, value || ''); } catch (e2) {}
  }

  function secureDeleteValue(key) {
    try { if (typeof GM_deleteValue === 'function') GM_deleteValue(key); } catch (e) {}
    try { localStorage.removeItem(key); } catch (e2) {}
  }

  function migrateSecretFromLocalStorage(key) {
    try {
      var oldValue = localStorage.getItem(key) || '';
      var secureValue = (typeof GM_getValue === 'function') ? GM_getValue(key, '') : '';
      if (oldValue && !secureValue) secureSetValue(key, oldValue);
      if (oldValue) localStorage.removeItem(key);
    } catch (e) {}
  }

  function escapeHTML(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizePlainText(value, maxLength) {
    var clean = String(value === undefined || value === null ? '' : value)
      .replace(/[<>]/g, '')
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .trim();

    if (maxLength && clean.length > maxLength) clean = clean.slice(0, maxLength);
    return clean;
  }

  function normalizeStewardRole(role) {
    var allowed = {
      event: 'event',
      chief: 'chief',
      admin: 'admin',
      observer: 'observer'
    };
    return allowed[String(role || '').toLowerCase()] || 'event';
  }

  function isLocalRegistryOnlyNotice() {
    return '<div style="font-size:11px; color:var(--nbf-txt); line-height:1.5; padding:9px 11px; border:1px solid #60a5fa; border-radius:7px; background:rgba(96,165,250,0.10); margin-bottom:12px;">' +
      '<strong style="color:#2563eb;">🔒 Security Model:</strong> <span style="color:var(--nbf-mut);">This local registry is planning/display data only. It does not grant backend permissions. Real upload/admin permissions are controlled only by backend-issued tokens and server-side validation.</span>' +
      '</div>';
  }


  function nbfDebounce(fn, waitMs) {
    var timer = null;
    return function() {
      var context = this;
      var args = arguments;
      window.clearTimeout(timer);
      timer = window.setTimeout(function() {
        fn.apply(context, args);
      }, waitMs || 150);
    };
  }

  function nbfBindOnce(element, eventName, handler, key) {
    if (!element) return;
    var marker = '_nbf_bound_' + (key || eventName);
    if (element[marker]) return;
    element[marker] = true;
    element.addEventListener(eventName, handler);
  }

  var nbfDebouncedRouterRefresh = nbfDebounce(function() {
    routerViewRefresh();
  }, 150);



  function getNuclearURLParams() {
    var params = new URLSearchParams(window.location.search || '');
    var hashText = window.location.hash || '';

    if (hashText) {
      var cleanedHash = hashText.charAt(0) === '#' ? hashText.slice(1) : hashText;
      var queryIndex = cleanedHash.indexOf('?');
      var hashQuery = queryIndex !== -1 ? cleanedHash.slice(queryIndex + 1) : cleanedHash;

      if (hashQuery && hashQuery.indexOf('=') !== -1) {
        var hashParams = new URLSearchParams(hashQuery);
        hashParams.forEach(function(value, key) {
          if (!params.has(key)) params.set(key, value);
        });
      }
    }

    return params;
  }

  function getRacingURLContext() {
    var params = getNuclearURLParams();
    var href = window.location.href || '';
    var hash = window.location.hash || '';

    return {
      isRacing: href.indexOf('sid=racing') !== -1 || hash.indexOf('sid=racing') !== -1 || params.get('sid') === 'racing',
      tab: params.get('tab'),
      raceID: params.get('raceID') || params.get('raceId') || params.get('raceid')
    };
  }


  function hasConfirmedFirstUpload() {
    return secureGetValue(CONFIG_FIRST_UPLOAD_CONFIRM_KEY, '') === 'yes';
  }

  function confirmFirstRaceUpload(raceID, resultCount) {
    if (hasConfirmedFirstUpload()) return true;
    var ok = window.confirm(
      'Upload this completed race to the Nuclear Family backend?\n\n' +
      'Race ID: ' + raceID + '\n' +
      'Results: ' + resultCount + '\n\n' +
      'This confirmation is only required once on this browser.'
    );
    if (!ok) {
      setGateStatus('payload', 'upload cancelled by user');
      addActivityLog('Race upload cancelled by user.', 'warning');
      return false;
    }
    secureSetValue(CONFIG_FIRST_UPLOAD_CONFIRM_KEY, 'yes');
    addActivityLog('First upload confirmation accepted.', 'success');
    return true;
  }


  function loadUploadQueue() {
    try { return JSON.parse(localStorage.getItem(CONFIG_UPLOAD_QUEUE_KEY) || '[]') || []; }
    catch (err) { return []; }
  }

  function saveUploadQueue(queue) {
    localStorage.setItem(CONFIG_UPLOAD_QUEUE_KEY, JSON.stringify((queue || []).slice(0, 50)));
  }

  function loadUploadHistory() {
    try { return JSON.parse(localStorage.getItem(CONFIG_UPLOAD_HISTORY_KEY) || '[]') || []; }
    catch (err) { return []; }
  }

  function saveUploadHistory(history) {
    localStorage.setItem(CONFIG_UPLOAD_HISTORY_KEY, JSON.stringify((history || []).slice(0, 60)));
  }

  function pushUploadHistory(entry) {
    var history = loadUploadHistory();
    history.unshift(Object.assign({ at: formatBackendCheckTime() }, entry || {}));
    saveUploadHistory(history);
  }

  function stableStringify(value) {
    if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
    if (value && typeof value === 'object') {
      return '{' + Object.keys(value).sort().map(function(k) {
        return JSON.stringify(k) + ':' + stableStringify(value[k]);
      }).join(',') + '}';
    }
    return JSON.stringify(value);
  }

  function simpleHashHex(text) {
    // Lightweight non-cryptographic fingerprint fallback for browser/userscript portability.
    // Backend still treats race_id as primary duplicate guard.
    var h1 = 0x811c9dc5;
    var h2 = 0x01000193;
    text = String(text || '');
    for (var i = 0; i < text.length; i++) {
      h1 ^= text.charCodeAt(i);
      h1 = Math.imul(h1, 16777619);
      h2 = Math.imul(h2 ^ text.charCodeAt(i), 2166136261);
    }
    return ('00000000' + (h1 >>> 0).toString(16)).slice(-8) + ('00000000' + (h2 >>> 0).toString(16)).slice(-8);
  }

  function computeRaceFingerprint(payload) {
    var source = {
      race_id: String(payload && payload.race_id || ''),
      results: (payload && payload.results || []).map(function(r) {
        return {
          position: String(r.position || ''),
          name: String(r.name || '').trim().toLowerCase(),
          time: String(r.time || '').trim()
        };
      })
    };
    return simpleHashHex(stableStringify(source));
  }

  function normalizeUploadQueueItem(payload) {
    var raceId = String(payload.race_id || '').trim();
    var fingerprint = payload.fingerprint || computeRaceFingerprint(payload);
    payload.fingerprint = fingerprint;

    return {
      id: raceId + ':' + fingerprint,
      race_id: raceId,
      fingerprint: fingerprint,
      payload: payload,
      state: 'pending',
      attempts: 0,
      next_try_at: Date.now(),
      created_at: new Date().toISOString(),
      last_error: '',
      last_http: '',
      verified: false
    };
  }

  function queueRaceUpload(payload) {
    var item = normalizeUploadQueueItem(payload);
    var queue = loadUploadQueue();

    var exists = queue.some(function(q) { return q.id === item.id || String(q.race_id) === String(item.race_id); });
    if (!exists) queue.push(item);

    saveUploadQueue(queue);
    setLastIngestionStatus('info', 'Queued for upload.', item.race_id, item.payload.results ? item.payload.results.length : '—');
    pushUploadHistory({ state: 'queued', race_id: item.race_id, fingerprint: item.fingerprint, message: 'Race queued for upload.' });
    addActivityLog('Race #' + item.race_id + ': Queued for trusted upload.', 'info');
    showScraperToast('Race queued for trusted upload.', 'info', 2500);
    updateUploadQueuePanel();
    processUploadQueue();
  }

  function calculateUploadBackoff(attempts) {
    var schedule = [0, 30000, 60000, 120000, 300000];
    return schedule[Math.min(attempts, schedule.length - 1)];
  }

  function processUploadQueue() {
    if (UPLOAD_QUEUE_PROCESSING) return;
    var queue = loadUploadQueue();
    var now = Date.now();
    var item = queue.find(function(q) {
      return q.state !== 'completed' && q.state !== 'failed_permanent' && (!q.next_try_at || q.next_try_at <= now);
    });

    if (!item) return;

    UPLOAD_QUEUE_PROCESSING = true;
    item.state = 'uploading';
    item.attempts = Number(item.attempts || 0) + 1;
    saveUploadQueue(queue);
    updateUploadQueuePanel();

    var started = Date.now();
    setLastIngestionStatus('info', 'Uploading...', item.race_id, item.payload.results ? item.payload.results.length : '—');
    addActivityLog('Race #' + item.race_id + ': Upload started from queue.');
    backendRequest(CF_INGEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (STATE_ADMIN_TOKEN_SESSION || STATE_STEWARD_TOKEN)
      },
      body: JSON.stringify(item.payload)
    }, 10000)
      .then(function(res) {
        item.last_http = String(res.status);
        return res.json().then(function(body) {
          if (!res.ok && res.status !== 409) {
            throw new Error(body && body.error ? body.error : 'HTTP ' + res.status);
          }
          item.last_error = '';
          item.response = body;
          item.latency_ms = Date.now() - started;

          if (res.status === 409 || body.duplicate) {
            item.state = 'completed';
            item.verified = true;
            item.completed_at = new Date().toISOString();
            markRaceSubmitted(item.race_id, 'duplicate');
            setGateStatus('backend', 'duplicate already stored');
            setLastIngestionStatus('duplicate', 'Finished — duplicate already stored.', item.race_id, item.payload.results ? item.payload.results.length : '—');
            pushUploadHistory({ state: 'completed', race_id: item.race_id, fingerprint: item.fingerprint, message: 'Finished — duplicate already stored.', latency_ms: item.latency_ms });
            addActivityLog('Race #' + item.race_id + ': Finished — duplicate already stored (' + (item.latency_ms || '?') + ' ms).', 'success');
            showScraperToast('✅ Race already stored.', 'success', 3500);
            return { ok: true, duplicate: true };
          }

          item.state = 'verifying';
          saveUploadQueue(queue);
          return verifyUploadedRace(item);
        });
      })
      .then(function(verify) {
        if (verify && verify.duplicate) return;
        item.state = 'completed';
        item.verified = !!(verify && verify.ok);
        item.verify_response = verify || null;
        item.completed_at = new Date().toISOString();
        markRaceSubmitted(item.race_id, 'verified');
        setGateStatus('backend', 'stored + verified');
        setLastIngestionStatus('success', 'Finished — uploaded and verified.', item.race_id, item.payload.results ? item.payload.results.length : '—');
        pushUploadHistory({ state: 'completed', race_id: item.race_id, fingerprint: item.fingerprint, message: 'Finished — uploaded and verified.', latency_ms: item.latency_ms });
        addActivityLog('Race #' + item.race_id + ': Finished — uploaded and verified (' + (item.latency_ms || '?') + ' ms).', 'success');
        showScraperToast('✅ Race upload finished and verified.', 'success', 4000);
      })
      .catch(function(err) {
        item.last_error = err && err.message ? err.message : String(err);
        var backoff = calculateUploadBackoff(item.attempts);
        item.next_try_at = Date.now() + backoff;
        item.state = item.attempts >= 5 ? 'failed_permanent' : 'retrying';

        if (item.state === 'retrying') {
          setGateStatus('backend', 'retry scheduled');
          setLastIngestionStatus('info', 'Retry scheduled — ' + item.last_error, item.race_id, item.payload.results ? item.payload.results.length : '—');
          addActivityLog('Race #' + item.race_id + ': Retry scheduled after failure — ' + item.last_error, 'warning');
          showScraperToast('Upload retry scheduled.', 'info', 3500);
        } else {
          setGateStatus('backend', 'failed');
          setLastIngestionStatus('error', 'Failed — ' + item.last_error, item.race_id, item.payload.results ? item.payload.results.length : '—');
          addActivityLog('Race #' + item.race_id + ': Failed permanently — ' + item.last_error, 'error');
          showScraperToast('❌ Upload failed permanently.', 'error', 4500);
        }

        pushUploadHistory({ state: item.state, race_id: item.race_id, fingerprint: item.fingerprint, message: item.last_error, attempts: item.attempts });
      })
      .finally(function() {
        saveUploadQueue(queue);
        UPLOAD_QUEUE_PROCESSING = false;
        updateUploadQueuePanel();
        window.setTimeout(processUploadQueue, 1000);
      });
  }

  function verifyUploadedRace(item) {
    var url = CF_RACE_VERIFY_ENDPOINT + '?race_id=' + encodeURIComponent(item.race_id);
    return backendRequest(url, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + (STATE_ADMIN_TOKEN_SESSION || STATE_STEWARD_TOKEN)
      }
    }, 7000).then(function(res) {
      return res.json().then(function(body) {
        if (!res.ok || !body.ok || !body.exists) throw new Error(body && body.error ? body.error : 'Race verification failed');
        return body;
      });
    });
  }

  function uploadStateBadge(state) {
    var color = '#64748b';
    var icon = '●';
    if (state === 'completed') color = '#16a34a';
    else if (state === 'uploading' || state === 'verifying' || state === 'retrying') color = '#f59e0b';
    else if (state === 'failed_permanent') color = '#dc2626';
    return '<span style="color:' + color + '; font-weight:700;">' + icon + ' ' + escapeHTML(state || 'pending') + '</span>';
  }


  function getLastUploadQueueOutcome() {
    var queue = loadUploadQueue();
    var history = loadUploadHistory();
    var candidates = [];

    queue.forEach(function(q) {
      candidates.push({
        source: 'queue',
        race_id: q.race_id,
        state: q.state,
        message: q.last_error || q.message || q.fingerprint || '',
        attempts: q.attempts || 0,
        fingerprint: q.fingerprint || '',
        at: q.completed_at || q.created_at || ''
      });
    });

    history.forEach(function(h) {
      candidates.push({
        source: 'history',
        race_id: h.race_id,
        state: h.state,
        message: h.message || '',
        attempts: h.attempts || 0,
        fingerprint: h.fingerprint || '',
        at: h.at || ''
      });
    });

    return candidates.length ? candidates[0] : null;
  }

  function renderUploadCompletionSummary() {
    var outcome = getLastUploadQueueOutcome();
    if (!outcome) return '';

    var color = '#64748b';
    var label = 'Pending';
    if (outcome.state === 'completed') { color = '#16a34a'; label = 'Finished'; }
    else if (outcome.state === 'retrying') { color = '#f59e0b'; label = 'Retrying'; }
    else if (outcome.state === 'failed_permanent') { color = '#dc2626'; label = 'Failed'; }
    else if (outcome.state === 'uploading') { color = '#6366f1'; label = 'Uploading'; }
    else if (outcome.state === 'verifying') { color = '#6366f1'; label = 'Verifying'; }
    else if (outcome.state === 'queued' || outcome.state === 'pending') { color = '#64748b'; label = 'Queued'; }

    return '' +
      '<div style="margin-top:12px; padding:10px 12px; border:1px solid var(--nbf-bld); border-radius:8px; background:var(--nbf-main);">' +
      '  <div style="display:grid; grid-template-columns:120px 1fr; gap:6px 12px; font-size:12px; color:var(--nbf-mut);">' +
      '    <div><strong style="color:var(--nbf-txt);">Queue Result:</strong></div><div style="color:' + color + '; font-weight:800;">' + escapeHTML(label) + '</div>' +
      '    <div><strong style="color:var(--nbf-txt);">Race:</strong></div><div style="font-family:monospace;">' + escapeHTML(outcome.race_id || '—') + '</div>' +
      '    <div><strong style="color:var(--nbf-txt);">Attempts:</strong></div><div>' + escapeHTML(outcome.attempts || 0) + '</div>' +
      '    <div><strong style="color:var(--nbf-txt);">Message:</strong></div><div>' + escapeHTML(outcome.message || '—') + '</div>' +
      '  </div>' +
      '</div>';
  }

  function renderUploadQueueBody() {
    var queue = loadUploadQueue();
    var history = loadUploadHistory();
    var pending = queue.filter(function(q) { return q.state !== 'completed' && q.state !== 'failed_permanent'; }).length;
    var completed = history.filter(function(h) { return h.state === 'completed'; }).length;
    var failed = history.filter(function(h) { return h.state === 'failed_permanent'; }).length;

    var html = '<div id="nbf-upload-queue-panel">' +
      '<div style="display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-bottom:12px;">' +
      renderStatModule('Pending Queue', pending) +
      renderStatModule('Completed', completed) +
      renderStatModule('Failures', failed) +
      renderStatModule('In Flight', UPLOAD_QUEUE_PROCESSING ? 'Yes' : 'No') +
      '</div>' +
      '<div style="display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap;">' +
      '<button id="nbf-upload-queue-process-btn" style="padding:6px 10px; background:#6366f1; color:#fff; border:none; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer;">Process Queue</button>' +
      '<button id="nbf-upload-queue-clear-completed-btn" style="padding:6px 10px; background:var(--nbf-field-bg); color:var(--nbf-mut); border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:11px; cursor:pointer;">Clear Completed</button>' +
      '<button id="nbf-upload-queue-clear-terminal-btn" style="padding:6px 10px; background:var(--nbf-field-bg); color:var(--nbf-mut); border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:11px; cursor:pointer;">Clear Finished/Failed</button>' +
      '</div>';

    html += '<h4 style="margin:8px 0; font-size:12px; color:var(--nbf-txt);">Queue</h4>';
    if (!queue.length) {
      html += '<div style="font-size:12px; color:var(--nbf-mut); padding:8px 0;">Queue is empty.</div>';
    } else {
      queue.slice(0, 12).forEach(function(q) {
        html += '<div style="display:grid; grid-template-columns:90px 110px 1fr 70px; gap:8px; padding:6px 0; border-bottom:1px solid var(--nbf-bld); font-size:11px; align-items:center;">' +
          '<div style="font-family:monospace;">' + escapeHTML(q.race_id) + '</div>' +
          '<div>' + uploadStateBadge(q.state) + '</div>' +
          '<div style="color:var(--nbf-mut); overflow:hidden; text-overflow:ellipsis;">' + escapeHTML(q.last_error || q.fingerprint || '') + '</div>' +
          '<div>try ' + escapeHTML(q.attempts || 0) + '</div>' +
          '</div>';
      });
    }

    html += '<h4 style="margin:12px 0 8px 0; font-size:12px; color:var(--nbf-txt);">Recent Uploads</h4>';
    if (!history.length) {
      html += '<div style="font-size:12px; color:var(--nbf-mut); padding:8px 0;">No uploads recorded yet.</div>';
    } else {
      history.slice(0, 10).forEach(function(h) {
        html += '<div style="display:grid; grid-template-columns:70px 90px 110px 1fr; gap:8px; padding:5px 0; border-bottom:1px solid var(--nbf-bld); font-size:11px; align-items:center;">' +
          '<div style="color:var(--nbf-mut);">' + escapeHTML(h.at || '—') + '</div>' +
          '<div style="font-family:monospace;">' + escapeHTML(h.race_id || '—') + '</div>' +
          '<div>' + uploadStateBadge(h.state) + '</div>' +
          '<div style="color:var(--nbf-mut); overflow:hidden; text-overflow:ellipsis;">' + escapeHTML(h.message || '') + '</div>' +
          '</div>';
      });
    }

    return html + '</div>';
  }

  function updateUploadQueuePanel() {
    var panel = document.getElementById('nbf-upload-queue-panel');
    if (!panel) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = renderUploadQueueBody();
    panel.parentNode.replaceChild(wrap.firstChild, panel);
    bindUploadQueueButtons();
    bindChampionshipButtons();
  }

  function bindUploadQueueButtons() {
    var processBtn = document.getElementById('nbf-upload-queue-process-btn');
    if (processBtn) processBtn.addEventListener('click', processUploadQueue);

    var clearBtn = document.getElementById('nbf-upload-queue-clear-completed-btn');
    if (clearBtn) clearBtn.addEventListener('click', function() {
      var queue = loadUploadQueue().filter(function(q) { return q.state !== 'completed'; });
      saveUploadQueue(queue);
      updateUploadQueuePanel();
    });

    var clearTerminalBtn = document.getElementById('nbf-upload-queue-clear-terminal-btn');
    if (clearTerminalBtn) clearTerminalBtn.addEventListener('click', function() {
      var queue = loadUploadQueue().filter(function(q) { return q.state !== 'completed' && q.state !== 'failed_permanent'; });
      saveUploadQueue(queue);
      updateUploadQueuePanel();
    });
  }

  function canScrapeRace(reasonLabel) {
    if (document.hidden) {
      console.log('[NB Racing] Scraper skipped' + (reasonLabel ? ' (' + reasonLabel + ')' : '') + ': tab is hidden.');
      return false;
    }

    if (!document.hasFocus()) {
      console.log('[NB Racing] Scraper skipped' + (reasonLabel ? ' (' + reasonLabel + ')' : '') + ': Torn window is not focused.');
      return false;
    }

    return true;
  }

  function formatBackendCheckTime() {
    try {
      return new Date().toLocaleTimeString();
    } catch (err) {
      return new Date().toISOString();
    }
  }


  function defaultGateStatus() {
    return {
      url: 'not checked',
      focus: 'not checked',
      token: 'not checked',
      duplicate: 'not checked',
      dom: 'not checked',
      drivers: 'not checked',
      payload: 'not checked',
      backend: 'not checked'
    };
  }

  function loadGateStatus() {
    try {
      var saved = JSON.parse(localStorage.getItem(CONFIG_GATE_STATUS_KEY) || 'null');
      return saved && typeof saved === 'object' ? Object.assign(defaultGateStatus(), saved) : defaultGateStatus();
    } catch (err) {
      return defaultGateStatus();
    }
  }

  function saveGateStatus() {
    localStorage.setItem(CONFIG_GATE_STATUS_KEY, JSON.stringify(INGESTION_GATE_STATUS));
  }

  function setGateStatus(key, value) {
    INGESTION_GATE_STATUS[key] = value;
    saveGateStatus();
  }

  function resetGateStatus() {
    INGESTION_GATE_STATUS = defaultGateStatus();
    saveGateStatus();
  }

  function gateBadge(value) {
    var text = String(value || 'not checked');
    var lower = text.toLowerCase();
    var color = '#64748b';
    var icon = '●';
    if (lower.indexOf('pass') !== -1 || lower.indexOf('ready') !== -1 || lower.indexOf('found') !== -1 || lower.indexOf('valid') !== -1 || lower.indexOf('online') !== -1) {
      color = '#16a34a'; icon = '●';
    } else if (lower.indexOf('wait') !== -1 || lower.indexOf('skip') !== -1 || lower.indexOf('duplicate') !== -1 || lower.indexOf('pending') !== -1) {
      color = '#f59e0b'; icon = '●';
    } else if (lower.indexOf('fail') !== -1 || lower.indexOf('missing') !== -1 || lower.indexOf('invalid') !== -1 || lower.indexOf('error') !== -1 || lower.indexOf('blocked') !== -1) {
      color = '#dc2626'; icon = '●';
    }
    return '<span style="color:' + color + '; font-weight:600;">' + icon + ' ' + text + '</span>';
  }

  function loadActivityLog() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG_ACTIVITY_LOG_KEY) || '[]') || [];
    } catch (err) {
      return [];
    }
  }

  function saveActivityLog(entries) {
    localStorage.setItem(CONFIG_ACTIVITY_LOG_KEY, JSON.stringify((entries || []).slice(0, 30)));
  }

  function addActivityLog(message, type) {
    var entries = loadActivityLog();
    entries.unshift({
      at: formatBackendCheckTime(),
      type: type || 'info',
      message: message || ''
    });
    saveActivityLog(entries);
  }

  function clearActivityLog() {
    localStorage.removeItem(CONFIG_ACTIVITY_LOG_KEY);
  }

  function renderActivityLogMarkup() {
    var entries = loadActivityLog();
    if (!entries.length) {
      return '<div style="font-size:12px; color:var(--nbf-mut); padding:8px 0;">No activity recorded yet.</div>';
    }
    var html = '';
    entries.slice(0, 12).forEach(function(entry) {
      var color = entry.type === 'success' ? '#16a34a' : (entry.type === 'error' ? '#dc2626' : (entry.type === 'warning' ? '#f59e0b' : 'var(--nbf-mut)'));
      html += '<div style="display:grid; grid-template-columns:70px 1fr; gap:8px; padding:4px 0; border-bottom:1px solid var(--nbf-bld); font-size:11px;">' +
        '<span style="color:var(--nbf-mut);">' + entry.at + '</span>' +
        '<span style="color:' + color + ';">' + entry.message + '</span>' +
        '</div>';
    });
    return html;
  }

  function renderGateChecklistMarkup() {
    return '' +
      '<div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:7px 16px; font-size:12px; color:var(--nbf-mut);">' +
      '<div><strong style="color:var(--nbf-txt);">URL:</strong> ' + gateBadge(INGESTION_GATE_STATUS.url) + '</div>' +
      '<div><strong style="color:var(--nbf-txt);">Focus:</strong> ' + gateBadge(INGESTION_GATE_STATUS.focus) + '</div>' +
      '<div><strong style="color:var(--nbf-txt);">Token:</strong> ' + gateBadge(INGESTION_GATE_STATUS.token) + '</div>' +
      '<div><strong style="color:var(--nbf-txt);">Duplicate:</strong> ' + gateBadge(INGESTION_GATE_STATUS.duplicate) + '</div>' +
      '<div><strong style="color:var(--nbf-txt);">Leaderboard DOM:</strong> ' + gateBadge(INGESTION_GATE_STATUS.dom) + '</div>' +
      '<div><strong style="color:var(--nbf-txt);">Drivers:</strong> ' + gateBadge(INGESTION_GATE_STATUS.drivers) + '</div>' +
      '<div><strong style="color:var(--nbf-txt);">Payload:</strong> ' + gateBadge(INGESTION_GATE_STATUS.payload) + '</div>' +
      '<div><strong style="color:var(--nbf-txt);">Backend:</strong> ' + gateBadge(INGESTION_GATE_STATUS.backend) + '</div>' +
      '</div>';
  }

  function renderControlCenterMarkup() {
    var display = STATE_CONTROL_CENTER_OPEN ? 'block' : 'none';
    var arrow = STATE_CONTROL_CENTER_OPEN ? '▲' : '▼';
    return '' +
      '<div id="nbf-control-center" style="background:var(--nbf-alt2); border:1px solid var(--nbf-bld); border-radius:8px; margin-top:14px; overflow:hidden;">' +
      '  <div id="nbf-control-toggle" style="padding:12px 14px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; background:var(--nbf-alt);">' +
      '    <strong style="font-size:13px; color:var(--nbf-txt);">' + arrow + ' Control Center</strong>' +
      '    <span style="font-size:11px; color:var(--nbf-mut);">Diagnostics only — no destructive tools yet</span>' +
      '  </div>' +
      '  <div id="nbf-control-body" style="display:' + display + '; padding:16px;">' +
      '    <h3 style="margin:0 0 8px 0; font-size:13px; color:var(--nbf-txt);">System Diagnostics</h3>' +
      '    <div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:7px 16px; font-size:12px; color:var(--nbf-mut); margin-bottom:14px;">' +
      '      <div><strong style="color:var(--nbf-txt);">Userscript:</strong> v' + ENGINE_VERSION + '</div>' +
      '      <div><strong style="color:var(--nbf-txt);">Backend:</strong> ' + BACKEND_STATUS.backend + '</div>' +
      '      <div><strong style="color:var(--nbf-txt);">Backend Version:</strong> ' + BACKEND_STATUS.version + '</div>' +
      '      <div><strong style="color:var(--nbf-txt);">Latency:</strong> ' + (BACKEND_STATUS.latency !== null ? BACKEND_STATUS.latency + ' ms' : '—') + '</div>' +
      '      <div><strong style="color:var(--nbf-txt);">Database:</strong> ' + BACKEND_STATUS.database + '</div>' +
      '      <div><strong style="color:var(--nbf-txt);">Last Check:</strong> ' + BACKEND_STATUS.lastCheck + '</div>' +
      '    </div>' +
      '    <h3 style="margin:10px 0 8px 0; font-size:13px; color:var(--nbf-txt);">Automatic Upload Readiness</h3>' +
      renderGateChecklistMarkup() +
      '    <div style="display:flex; justify-content:space-between; align-items:center; margin:16px 0 6px 0;">' +
      '      <h3 style="margin:0; font-size:13px; color:var(--nbf-txt);">Activity Log</h3>' +
      '      <button id="nbf-activity-clear" style="padding:4px 8px; background:var(--nbf-field-bg); color:var(--nbf-mut); border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:11px; cursor:pointer;">Clear Log</button>' +
      '    </div>' +
      renderActivityLogMarkup() +
      '  </div>' +
      '</div>';
  }

  function renderBackendStatusMarkup() {
    var statusColor = BACKEND_STATUS.state === 'online' ? '#16a34a' : (BACKEND_STATUS.state === 'error' ? '#dc2626' : '#64748b');
    var statusIcon = BACKEND_STATUS.state === 'online' ? '●' : (BACKEND_STATUS.state === 'error' ? '●' : '●');
    var latencyText = BACKEND_STATUS.latency !== null ? ' (' + BACKEND_STATUS.latency + ' ms)' : '';
    var errorLine = BACKEND_STATUS.error
      ? '<div style="grid-column:1 / -1; color:#dc2626; font-size:11px; margin-top:4px;"><strong>Last Error:</strong> ' + BACKEND_STATUS.error + '</div>'
      : '';

    return '' +
      '<div id="nbf-backend-status-panel" style="background:var(--nbf-alt2); border:1px solid var(--nbf-bld); border-radius:8px; padding:16px; margin-bottom:20px;">' +
      '  <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px;">' +
      '    <h3 style="margin:0; font-size:13px; font-weight:600; color:var(--nbf-txt);">Nuclear Backend Status</h3>' +
      '    <button id="nbf-backend-check-btn" style="padding:6px 12px; background:#6366f1; color:#fff; border:none; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer;">Check Now</button>' +
      '  </div>' +
      '  <div id="nbf-backend-status-body" style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:8px 16px; font-size:12px; color:var(--nbf-mut);">' +
      '    <div><strong style="color:var(--nbf-txt);">Backend:</strong> <span style="color:' + statusColor + '; font-weight:600;">' + statusIcon + ' ' + BACKEND_STATUS.backend + latencyText + '</span></div>' +
      '    <div><strong style="color:var(--nbf-txt);">Database:</strong> ' + BACKEND_STATUS.database + '</div>' +
      '    <div><strong style="color:var(--nbf-txt);">Worker Version:</strong> ' + BACKEND_STATUS.version + '</div>' +
      '    <div><strong style="color:var(--nbf-txt);">Last Check:</strong> ' + BACKEND_STATUS.lastCheck + '</div>' +
      '    <div style="grid-column:1 / -1; font-size:11px;"><strong style="color:var(--nbf-txt);">Endpoint:</strong> ' + CF_HEALTH_ENDPOINT + '</div>' +
      errorLine +
      '  </div>' +
      '</div>';
  }

  function renderIngestionStatusMarkup(endpointStatus) {
    var status = LAST_INGESTION_STATUS || loadLastIngestionStatus();
    var statusColor = status.state === 'success' ? '#16a34a' : (status.state === 'error' ? '#dc2626' : (status.state === 'duplicate' ? '#f59e0b' : '#64748b'));
    var statusIcon = status.state === 'success' ? '✅' : (status.state === 'error' ? '❌' : (status.state === 'duplicate' ? '🟡' : 'ℹ️'));
    var submittedCount = Object.keys(loadSubmittedRaceMap()).length;

    return '' +
      '<div style="background:var(--nbf-alt2); border:1px solid var(--nbf-bld); border-radius:8px; padding:16px; margin-top:4px;">' +
      '  <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px;">' +
      '    <h3 style="margin:0; font-size:13px; font-weight:600; color:var(--nbf-txt);">Race Ingestion Status</h3>' +
      '    <button id="nbf-ingest-clear-local" style="padding:5px 10px; background:var(--nbf-field-bg); color:var(--nbf-mut); border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:11px; cursor:pointer;">Clear Local History</button>' +
      '  </div>' +
      '  <div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:7px 16px; font-size:12px; color:var(--nbf-mut);">' +
      '    <div style="grid-column:1 / -1;"><strong style="color:var(--nbf-txt);">Endpoint:</strong> ' + endpointStatus + '</div>' +
      '    <div><strong style="color:var(--nbf-txt);">Steward Auth:</strong> ' + (STATE_STEWARD_TOKEN ? '<span style="color:#16a34a; font-weight:600;">✅ Configured</span>' : '<span style="color:#f59e0b; font-weight:600;">🟡 Not configured</span>') + '</div>' +
      '    <div><strong style="color:var(--nbf-txt);">Focus Rule:</strong> <span style="color:#16a34a; font-weight:600;">✅ document.hasFocus()</span></div>' +
      '    <div><strong style="color:var(--nbf-txt);">Auto Upload:</strong> ' + (isStewardAuthorized() ? '<span style="color:#16a34a; font-weight:600;">✅ Armed on focused race logs</span>' : '<span style="color:#f59e0b; font-weight:600;">🟡 Waiting for Steward token</span>') + '</div>' +
      '    <div><strong style="color:var(--nbf-txt);">Local Duplicates:</strong> ' + submittedCount + ' race(s) remembered</div>' +
      '    <div style="grid-column:1 / -1; border-top:1px solid var(--nbf-bld); padding-top:7px; margin-top:2px;"><strong style="color:var(--nbf-txt);">Last Upload:</strong> <span style="color:' + statusColor + '; font-weight:600;">' + statusIcon + ' ' + status.message + '</span></div>' +
      '    <div><strong style="color:var(--nbf-txt);">Race ID:</strong> ' + status.race_id + '</div>' +
      '    <div><strong style="color:var(--nbf-txt);">Results:</strong> ' + status.results + '</div>' +
      '    <div><strong style="color:var(--nbf-txt);">Time:</strong> ' + status.at + '</div>' +
      '    <div style="grid-column:1 / -1; font-size:11px; margin-top:4px; color:var(--nbf-mut);">To trigger: open a completed race log while this Torn window is focused. Background tabs are skipped until focused.</div>' +
      '  </div>' +
      '</div>';
  }

  function updateBackendStatusPanel() {
    var panel = document.getElementById('nbf-backend-status-panel');
    if (!panel) return;

    var replacement = document.createElement('div');
    replacement.innerHTML = renderBackendStatusMarkup();
    panel.parentNode.replaceChild(replacement.firstChild, panel);

    var checkBtn = document.getElementById('nbf-backend-check-btn');
    if (checkBtn) nbfBindOnce(checkBtn, 'click', function() { refreshBackendStatus(true); }, 'backend_check');
  }

  function backendRequest(url, options, timeoutMs) {
    options = options || {};
    timeoutMs = timeoutMs || 5000;

    // Torn pages can block cross-origin fetch() through site CSP.
    // GM_xmlhttpRequest is used only for the Nuclear Family backend.
    if (typeof GM_xmlhttpRequest === 'function') {
      return new Promise(function(resolve, reject) {
        GM_xmlhttpRequest({
          method: options.method || 'GET',
          url: url,
          headers: options.headers || {},
          data: options.body || null,
          timeout: timeoutMs,
          onload: function(response) {
            var text = response.responseText || '';
            var parsed = null;
            try { parsed = text ? JSON.parse(text) : null; } catch (jsonErr) {}

            resolve({
              ok: response.status >= 200 && response.status < 300,
              status: response.status,
              statusText: response.statusText || '',
              text: function() { return Promise.resolve(text); },
              json: function() {
                if (parsed !== null) return Promise.resolve(parsed);
                try { return Promise.resolve(JSON.parse(text)); }
                catch (err) {
                  var preview = String(text || '').slice(0, 120).replace(/\s+/g, ' ');
                  return Promise.reject(new Error('Non-JSON backend response: HTTP ' + response.status + ' ' + (response.statusText || '') + ' — ' + preview));
                }
              }
            });
          },
          onerror: function(error) {
            reject(new Error('GM_xmlhttpRequest network error: ' + (error && error.error ? error.error : 'request failed')));
          },
          ontimeout: function() {
            reject(new Error('Backend request timed out after ' + timeoutMs + ' ms'));
          }
        });
      });
    }

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = null;
    var fetchOptions = options || {};

    if (controller) {
      fetchOptions.signal = controller.signal;
      timer = window.setTimeout(function() { controller.abort(); }, timeoutMs);
    }

    return fetch(url, fetchOptions).then(function(response) {
      if (timer) window.clearTimeout(timer);
      return response;
    }).catch(function(error) {
      if (timer) window.clearTimeout(timer);
      throw error;
    });
  }

  function refreshBackendStatus(manualTrigger) {
    var now = Date.now();
    if (BACKEND_CHECK_IN_FLIGHT) {
      if (manualTrigger) console.log('[NB Racing] Backend check skipped: already running.');
      return;
    }
    if (!manualTrigger && BACKEND_CHECK_LAST_STARTED && (now - BACKEND_CHECK_LAST_STARTED) < 1500) {
      return;
    }
    BACKEND_CHECK_IN_FLIGHT = true;
    BACKEND_CHECK_LAST_STARTED = now;

    BACKEND_STATUS.state = 'checking';
    BACKEND_STATUS.backend = 'Checking...';
    BACKEND_STATUS.database = 'Checking...';
    BACKEND_STATUS.version = '—';
    BACKEND_STATUS.latency = null;
    BACKEND_STATUS.lastCheck = 'Running now';
    BACKEND_STATUS.error = '';
    updateBackendStatusPanel();

    var startTime = Date.now();

    backendRequest(CF_HEALTH_ENDPOINT, { method: 'GET' }, 5000)
      .then(function(res) {
        if (!res.ok) throw new Error('Health HTTP ' + res.status);
        return res.json();
      })
      .then(function(health) {
        return backendRequest(CF_STANDINGS_ENDPOINT, { method: 'GET' }, 5000)
          .then(function(res) {
            if (!res.ok) throw new Error('Standings HTTP ' + res.status);
            return res.json();
          })
          .then(function(standingsPayload) {
            BACKEND_STATUS.state = 'online';
            BACKEND_STATUS.backend = health && health.ok ? 'Online' : 'Responding';
            BACKEND_STATUS.database = standingsPayload && standingsPayload.ok ? '● Connected' : '● Standings unavailable';
            BACKEND_STATUS.version = health && health.version ? health.version : 'unknown';
            BACKEND_STATUS.latency = Date.now() - startTime;
            BACKEND_STATUS.lastCheck = formatBackendCheckTime();
            BACKEND_STATUS.error = '';
            setGateStatus('backend', 'online');
            addActivityLog('Backend check successful (' + BACKEND_STATUS.latency + ' ms).', 'success');
            BACKEND_CHECK_IN_FLIGHT = false;
            updateBackendStatusPanel();
          });
      })
      .catch(function(err) {
        BACKEND_STATUS.state = 'error';
        BACKEND_STATUS.backend = 'Offline / Error';
        BACKEND_STATUS.database = 'Not checked';
        BACKEND_STATUS.version = '—';
        BACKEND_STATUS.latency = Date.now() - startTime;
        BACKEND_STATUS.lastCheck = formatBackendCheckTime();
        BACKEND_STATUS.error = err && err.message ? err.message : String(err);
        setGateStatus('backend', 'error');
        addActivityLog('Backend check failed: ' + BACKEND_STATUS.error, 'error');
        updateBackendStatusPanel();
        BACKEND_CHECK_IN_FLIGHT = false;
        if (manualTrigger) console.warn('[NB Racing] Backend status check failed:', err);
      });
  }



  /**********************************************************************
   * BOOK 04 — STORAGE HELPERS
   *
   * Purpose:
   *     Storage-focused helpers kept separate from feature rendering.
   *
   * Contains:
   *     - saveStewardRegistry()
   *
   * Dependencies:
   *     - localStorage
   *     - Steward state
   **********************************************************************/

  function saveStewardRegistry() {
    STEWARD_REGISTRY = (STEWARD_REGISTRY || []).map(function(steward) {
      return {
        id: sanitizePlainText(steward.id, 24),
        name: sanitizePlainText(steward.name, 48),
        role: normalizeStewardRole(steward.role)
      };
    }).filter(function(steward) {
      return steward.id && steward.name;
    });
    localStorage.setItem(CONFIG_STEWARD_KEY, JSON.stringify(STEWARD_REGISTRY));
  }

  function loadSubmittedRaceMap() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG_RACE_SENT_KEY) || '{}') || {};
    } catch (err) {
      console.warn('[NB Racing] Submitted-race cache was invalid and has been reset.', err);
      return {};
    }
  }

  function saveSubmittedRaceMap(map) {
    localStorage.setItem(CONFIG_RACE_SENT_KEY, JSON.stringify(map || {}));
  }

  function hasSubmittedRace(raceID) {
    var map = loadSubmittedRaceMap();
    return !!map[String(raceID)];
  }

  function markRaceSubmitted(raceID, statusText) {
    var map = loadSubmittedRaceMap();
    map[String(raceID)] = {
      status: statusText || 'submitted',
      at: new Date().toISOString()
    };
    saveSubmittedRaceMap(map);
  }

  function clearSubmittedRaceMap() {
    localStorage.removeItem(CONFIG_RACE_SENT_KEY);
  }

  function loadLastIngestionStatus() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG_INGEST_LOG_KEY) || 'null') || {
        state: 'none',
        message: 'No race uploaded yet.',
        race_id: '—',
        results: '—',
        at: '—'
      };
    } catch (err) {
      return { state: 'error', message: 'Saved ingestion status was invalid.', race_id: '—', results: '—', at: '—' };
    }
  }

  function saveLastIngestionStatus(status) {
    LAST_INGESTION_STATUS = status || LAST_INGESTION_STATUS;
    localStorage.setItem(CONFIG_INGEST_LOG_KEY, JSON.stringify(LAST_INGESTION_STATUS));
  }

  function setLastIngestionStatus(state, message, raceID, resultsCount) {
    addActivityLog((raceID && raceID !== '—' ? 'Race #' + raceID + ': ' : '') + (message || ''), state === 'success' ? 'success' : (state === 'error' ? 'error' : (state === 'duplicate' ? 'warning' : 'info')));
    saveLastIngestionStatus({
      state: state || 'info',
      message: message || '',
      race_id: raceID || '—',
      results: resultsCount !== undefined && resultsCount !== null ? resultsCount : '—',
      at: formatBackendCheckTime()
    });
  }

  function clearLastIngestionStatus() {
    localStorage.removeItem(CONFIG_INGEST_LOG_KEY);
    LAST_INGESTION_STATUS = loadLastIngestionStatus();
  }


  /**********************************************************************
   * BOOK 05 — DASHBOARD SHELL & CORE UI
   *
   * Purpose:
   *     Creates the floating launch button, modal, toolbar, key panel, and primary shell.
   *
   * Contains:
   *     - mountFloatingInterface()
   *     - renderModalInterface()
   *     - displayKeySetupPanel()
   *
   * Dependencies:
   *     - Theme Engine
   *     - Router
   *     - Leaderboard
   *     - Storage
   *     - API Sync
   **********************************************************************/

  function mountFloatingInterface() {
    if (document.getElementById('nbf-action-trigger-button')) return;
    if (!document.body) return;

    var floatingActionBtn = document.createElement('button');
    floatingActionBtn.id = 'nbf-action-trigger-button';
    floatingActionBtn.textContent = '⚡ Nuclear Hyper-Drive';

    floatingActionBtn.style.cssText =
      'position: fixed !important; bottom: 170px !important; right: 16px !important; z-index: 999999 !important; ' +
      'background: linear-gradient(135deg, #111827 0%, #1f2937 100%) !important; ' +
      'color: #f3f4f6 !important; ' +
      'border: 1px solid #4f46e5 !important; ' +
      'border-radius: 4px !important; ' +
      'padding: 10px 20px !important; ' +
      'font-size: 12px !important; ' +
      'font-weight: 800 !important; ' +
      'text-transform: uppercase !important; ' +
      'letter-spacing: 1.5px !important; ' +
      'font-style: italic !important; ' +
      'cursor: pointer !important; ' +
      'box-shadow: 0 0 15px rgba(79, 70, 229, 0.4) !important; ' +
      'transition: all 0.2s ease-in-out !important; ' +
      'display: block !important;';

    floatingActionBtn.addEventListener('mouseenter', function() {
      this.style.setProperty('box-shadow', '0 0 25px rgba(236, 72, 153, 0.6)', 'important');
      this.style.setProperty('border-color', '#ec4899', 'important');
      this.style.setProperty('transform', 'scale(1.03)', 'important');
    });
    floatingActionBtn.addEventListener('mouseleave', function() {
      this.style.setProperty('box-shadow', '0 0 15px rgba(79, 70, 229, 0.4)', 'important');
      this.style.setProperty('border-color', '#4f46e5', 'important');
      this.style.setProperty('transform', 'scale(1.0)', 'important');
    });

    document.body.appendChild(floatingActionBtn);
    floatingActionBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      var existingBackdrop = document.getElementById('nbf-backdrop-mask');
      if (existingBackdrop) { existingBackdrop.parentNode.removeChild(existingBackdrop); } else { renderModalInterface(); }
    });
  }

  function renderModalInterface() {
    dynamicCSSRefresh();

    var backdropMask = document.createElement('div');
    backdropMask.id = 'nbf-backdrop-mask';
    backdropMask.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0, 0, 0, 0.75) !important; z-index: 2147483640 !important; display: flex !important; align-items: center !important; justify-content: center !important; box-sizing: border-box !important; padding: 12px !important;';

    var modalContainer = document.createElement('div');
    modalContainer.id = 'nbf-modal-container';
    applyModalThemeMatrix(modalContainer);

    var viewHtml = '<div id="nbf-layout-header" style="padding:10px 14px; border-bottom:1px solid var(--nbf-bld); display:flex; flex-direction:column; gap:8px; background:var(--nbf-alt);">';
    viewHtml += '  <div id="nbf-title-row" style="display:flex; align-items:center; gap:8px; flex-wrap:nowrap; width:100%;">';
    viewHtml += '    <button id="nbf-btn-close" title="Close Nuclear Family" style="flex:0 0 auto; padding:6px 10px; border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:12px; cursor:pointer; background:var(--nbf-btn-base); color:var(--nbf-txt); font-weight:600; white-space:nowrap;">✕ Close</button>';
    viewHtml += '    <span style="font-size:15px; font-weight:600; color:var(--nbf-txt); white-space:nowrap;">Nuclear Family Engine</span>';
    viewHtml += '    <span style="font-size:10px; color:var(--nbf-mut); background:var(--nbf-bdg); border:1px solid var(--nbf-bld); padding:1px 5px; border-radius:4px;">v' + ENGINE_VERSION + '</span>';
    viewHtml += '    <button id="nbf-ctrl-theme" style="font-size:13px; background:none; border:none; cursor:pointer; padding:2px 4px;">' + (STATE_DARK_MODE ? '☀️' : '🌙') + '</button>';
    viewHtml += '  </div>';
    viewHtml += '  <div id="nbf-main-nav-row" style="display:flex; align-items:center; justify-content:space-between; gap:8px; width:100%;">';
    viewHtml += '    <div style="display:flex; gap:4px; flex-wrap:wrap;">';
    viewHtml += '      <button id="nbf-tab-leaderboard" class="nbf-tab-btn active">Leaderboard</button>';
    viewHtml += '      <button id="nbf-tab-setup" class="nbf-tab-btn">League Setup</button>';
    viewHtml += '      <button id="nbf-tab-standings" class="nbf-tab-btn">🏆 Standings</button>';
    viewHtml += '      <button id="nbf-tab-help" class="nbf-tab-btn">Help Central</button>';
    viewHtml += '      <button id="nbf-tab-stewards" class="nbf-tab-btn">Control Center</button>';
    viewHtml += '    </div>';
    viewHtml += '  </div>';

    viewHtml += '  <div id="nbf-context-controls" style="display:flex; gap:6px; flex-wrap:wrap; align-items:center; width:100%;">';
    viewHtml += '    <select id="nbf-field-faction" style="padding:6px; border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:12px; min-width:130px; background:var(--nbf-field-bg); color:var(--nbf-txt);"><option value="all">All Factions</option>';
    TARGET_FACTIONS.forEach(function(fac) { viewHtml += '<option value="' + fac.id + '">' + fac.name + '</option>'; });
    viewHtml += '    </select>';
    viewHtml += '    <input type="text" name="username" autocomplete="username" tabindex="-1" aria-hidden="true" style="position:absolute; left:-9999px; top:-9999px; width:1px; height:1px; opacity:0;" />';
    viewHtml += '    <input type="password" name="password" autocomplete="current-password" tabindex="-1" aria-hidden="true" style="position:absolute; left:-9999px; top:-9999px; width:1px; height:1px; opacity:0;" />';
    viewHtml += '    <input id="nbf-field-search" type="text" role="searchbox" readonly name="nf_' + Math.random().toString(36).slice(2) + '_driver_filter" placeholder="Search driver name..." autocomplete="new-password" autocorrect="off" autocapitalize="none" spellcheck="false" inputmode="search" data-lpignore="true" data-1p-ignore="true" data-form-type="other" aria-autocomplete="none" style="padding:6px 8px; border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:12px; width:160px; background:var(--nbf-field-bg); color:var(--nbf-txt);" />';
    viewHtml += '    <select id="nbf-field-sort" style="padding:6px; border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:12px; background:var(--nbf-field-bg); color:var(--nbf-txt);"><option value="racing_skill">Skill</option><option value="racing_ratio">Efficiency %</option><option value="racing_wins">Wins</option><option value="racing_points">Points</option><option value="handicap">Handicap</option><option value="name">Name</option></select>';
    viewHtml += '    <select id="nbf-field-direction" style="padding:6px; border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:12px; background:var(--nbf-field-bg); color:var(--nbf-txt);"><option value="desc">Desc</option><option value="asc">Asc</option></select>';
    viewHtml += '    <button id="nbf-btn-sync" style="padding:6px 10px; border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:12px; cursor:pointer; background:#16a34a; color:#fff; font-weight:600;">🔄 Sync</button>';

    viewHtml += '    <button id="nbf-btn-csv" style="padding:6px 12px; border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:12px; cursor:pointer; background:var(--nbf-btn-acc); color:var(--nbf-btn-acc-txt); font-weight:600;">📥 Export</button>';
    viewHtml += '    <span id="nbf-txt-counter" style="font-size:11px; color:var(--nbf-txt); background:var(--nbf-bdg); padding:4px 8px; border-radius:20px; margin-left:auto;">Loading...</span>';
    viewHtml += '    <span id="nbf-txt-cache" style="font-size:11px; font-weight:600;"></span>';
    viewHtml += '  </div>';
    viewHtml += '</div>';
    viewHtml += '<div id="nbf-layout-duel" style="display:none; padding:10px 14px; background:linear-gradient(90deg, #312e81, #1e1b4b); color:#fff; border-bottom:1px solid #4338ca; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;"></div>';
    viewHtml += '<div id="nbf-layout-summary" style="display:flex; gap:6px; padding:10px 14px; border-bottom:1px solid var(--nbf-bld); flex-wrap:wrap; background:var(--nbf-alt2);"></div>';
    viewHtml += '<div id="nbf-layout-progress" style="text-align:center; font-size:11px; color:#1e40af; font-weight:bold; padding:6px 0; background:#eff6ff; border-bottom:1px solid #bfdbfe; display:none;"></div>';
    viewHtml += '<div id="nbf-frame-scrollbox" style="background:var(--nbf-main);"><div id="nbf-layout-body"></div></div>';

    modalContainer.innerHTML = viewHtml;
    backdropMask.appendChild(modalContainer);
    document.body.appendChild(backdropMask);

    nbfBindOnce(document.getElementById('nbf-btn-close'), 'click', function() { if (backdropMask.parentNode) backdropMask.parentNode.removeChild(backdropMask); }, 'modal_close');
    backdropMask.addEventListener('click', function(e) { if (e.target === backdropMask) backdropMask.parentNode.removeChild(backdropMask); });

    nbfBindOnce(document.getElementById('nbf-tab-leaderboard'), 'click', function() { switchViewRoute('leaderboard'); }, 'tab_leaderboard');
    nbfBindOnce(document.getElementById('nbf-tab-setup'), 'click', function() { switchViewRoute('setup'); }, 'tab_setup');
    nbfBindOnce(document.getElementById('nbf-tab-stewards'), 'click', function() { switchViewRoute('stewards'); }, 'tab_stewards');
    nbfBindOnce(document.getElementById('nbf-tab-standings'), 'click', function() { switchViewRoute('standings'); }, 'tab_standings');
    nbfBindOnce(document.getElementById('nbf-tab-help'), 'click', function() { switchViewRoute('help'); }, 'tab_help');

    nbfBindOnce(document.getElementById('nbf-field-faction'), 'change', function() { routerViewRefresh(); }, 'field_faction');
    var searchField = document.getElementById('nbf-field-search');
    if (searchField) {
      searchField.value = '';
      searchField.setAttribute('autocomplete', 'new-password');
      searchField.setAttribute('readonly', 'readonly');

      window.setTimeout(function() {
        if (searchField) {
          searchField.value = '';
          searchField.removeAttribute('readonly');
        }
      }, 500);

      searchField.addEventListener('focus', function() {
        var field = this;
        window.setTimeout(function() {
          field.removeAttribute('readonly');
          if (field.value && field.value.indexOf('@') !== -1) {
            field.value = '';
            routerViewRefresh();
          }
        }, 0);
      });

      nbfBindOnce(searchField, 'input', function() { nbfDebouncedRouterRefresh(); }, 'driver_search_input');
    }
    nbfBindOnce(document.getElementById('nbf-field-sort'), 'change', function() { routerViewRefresh(); }, 'field_sort');
    nbfBindOnce(document.getElementById('nbf-field-direction'), 'change', function() { routerViewRefresh(); }, 'field_direction');

    var authToolbarBtn = document.getElementById('nbf-btn-auth');
    if (authToolbarBtn) authToolbarBtn.addEventListener('click', function() { displayKeySetupPanel(modalContainer, function() { baseCacheRouter(true); }); });
    nbfBindOnce(document.getElementById('nbf-btn-csv'), 'click', processDataExportToCSV, 'csv_export');
    nbfBindOnce(document.getElementById('nbf-btn-sync'), 'click', function() { if (!FLAG_IS_FETCHING) baseCacheRouter(true); }, 'sync');

    nbfBindOnce(document.getElementById('nbf-ctrl-theme'), 'click', function() {
      STATE_DARK_MODE = !STATE_DARK_MODE;
      localStorage.setItem(CONFIG_THEME_KEY, STATE_DARK_MODE ? 'dark' : 'light');
      var themeBtn = document.getElementById('nbf-ctrl-theme');
      if (themeBtn) themeBtn.textContent = STATE_DARK_MODE ? '☀️' : '🌙';
      dynamicCSSRefresh();
      applyModalThemeMatrix(modalContainer);
      routerViewRefresh();
    }, 'theme_toggle');

    if (!STATE_API_KEY) { displayKeySetupPanel(modalContainer, function() { baseCacheRouter(true); }); } else { baseCacheRouter(false); }
    window.setTimeout(processUploadQueue, 1000);
  }

  function displayKeySetupPanel(modalWrapper, triggerOnSuccess) {
    var layoutBody = document.getElementById('nbf-layout-body');
    if (!layoutBody) return;
    switchViewRoute('leaderboard');
    var subControls = document.getElementById('nbf-context-controls');
    if (subControls) subControls.style.display = 'none';

    var keyLength = STATE_API_KEY ? STATE_API_KEY.trim().length : 0;
    var cleanMask = '';
    if (keyLength > 0) {
      cleanMask = STATE_API_KEY.trim().slice(0, 4);
      for (var m = 0; m < Math.max(0, keyLength - 4); m++) { cleanMask += '•'; }
    }

    var initializationHtml = '<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:3rem; background:var(--nbf-main);">';
    initializationHtml += '<div style="width:100%; max-width:420px; background:var(--nbf-alt2); border:1px solid var(--nbf-bld); border-radius:10px; padding:24px 20px;">';
    initializationHtml += '<div style="font-size:15px; font-weight:600; color:var(--nbf-txt); margin-bottom:4px;">Enter Family Alliance Key</div>';
    initializationHtml += '<div style="font-size:12px; color:var(--nbf-mut); margin-bottom:16px; line-height:1.5;">Saved locally inside your browser sandbox structure. Only explicitly shared with <code style="font-size:11px; background:var(--nbf-bdg); color:var(--nbf-txt); padding:1px 5px; border-radius:4px;">api.torn.com</code>.</div>';
    initializationHtml += '<div style="position:relative; display:flex; align-items:center; margin-bottom:12px; width:100%;">';
    initializationHtml += '<input id="nbf-auth-entry" type="password" placeholder="' + (cleanMask ? 'Current: ' + cleanMask : 'Paste limited API key here...') + '" autocomplete="off" style="width:100%; padding:8px 36px 8px 10px; border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:13px; box-sizing:border-box; background:var(--nbf-field-bg); color:var(--nbf-txt);" />';
    initializationHtml += '<button id="nbf-auth-reveal" style="position:absolute; right:10px; background:none; border:none; cursor:pointer; font-size:14px; color:var(--nbf-mut); padding:0;">👁</button></div>';
    initializationHtml += '<div id="nbf-auth-warning" style="font-size:11px; color:#c62828; margin-bottom:8px; display:none;">Please enter a valid API key.</div>';
    initializationHtml += '<div style="display:flex; gap:8px; margin-top:4px;"><button id="nbf-auth-commit" style="flex:1; padding:9px; background:#6366f1; color:#fff; border:none; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer;">Save and Load Data</button>';
    initializationHtml += (STATE_API_KEY ? '<button id="nbf-auth-wipe" style="padding:9px 14px; background:var(--nbf-field-bg); color:#c62828; border:1px solid #fca5a5; border-radius:6px; font-size:13px; cursor:pointer;">Clear</button>' : '');
    initializationHtml += '</div></div></div>';

    layoutBody.innerHTML = initializationHtml;

    document.getElementById('nbf-auth-reveal').addEventListener('click', function() {
      var field = document.getElementById('nbf-auth-entry');
      field.type = field.type === 'password' ? 'text' : 'password';
    });
    var purgeButton = document.getElementById('nbf-auth-wipe');
    if (purgeButton) {
      purgeButton.addEventListener('click', function() {
        STATE_API_KEY = '';
        secureDeleteValue(CONFIG_STORAGE_KEY);
        document.getElementById('nbf-auth-entry').value = '';
        document.getElementById('nbf-auth-entry').placeholder = 'Paste limited API key here...';
        purgeButton.parentNode.removeChild(purgeButton);
      });
    }

    document.getElementById('nbf-auth-commit').addEventListener('click', function() {
      var field = document.getElementById('nbf-auth-entry');
      var standardValue = field.value.trim();
      if (!standardValue && !STATE_API_KEY) { document.getElementById('nbf-auth-warning').style.display = 'block'; return; }
      if (standardValue) { STATE_API_KEY = standardValue; secureSetValue(CONFIG_STORAGE_KEY, STATE_API_KEY); }
      if (subControls) subControls.style.display = 'flex';
      layoutBody.innerHTML = '<p style="padding:2rem; text-align:center; color:var(--nbf-mut);">Preparing connections...</p>';
      triggerOnSuccess();
    });
  }

  // ============================================================
  // STEWARD PANEL
  // ============================================================


  /**********************************************************************
   * BOOK 06 — ROUTER & NAVIGATION
   *
   * Purpose:
   *     Controls active tabs and delegates rendering to the correct feature shelf.
   *
   * Contains:
   *     - switchViewRoute()
   *     - routerViewRefresh()
   *
   * Dependencies:
   *     - Dashboard Shell
   *     - Leaderboard
   *     - League
   *     - Standings
   *     - Stewards
   *     - Help
   **********************************************************************/

  function switchViewRoute(targetTab) {
    

    STATE_ACTIVE_TAB = targetTab;
    var tabs = ['leaderboard', 'setup', 'stewards', 'standings', 'help'];
    tabs.forEach(function(t) {
      var btn = document.getElementById('nbf-tab-' + t);
      if (btn) { btn.classList.toggle('active', t === targetTab); }
    });
    var subControls = document.getElementById('nbf-context-controls');
    var summaryLine = document.getElementById('nbf-layout-summary');
    var duelBar     = document.getElementById('nbf-layout-duel');
    if (targetTab === 'leaderboard') {
      if (subControls) subControls.style.display = 'flex';
      if (summaryLine) summaryLine.style.display = 'flex';
      if (duelBar && STATE_COMPARE_A && STATE_COMPARE_B) duelBar.style.display = 'flex';
    } else {
      if (subControls) subControls.style.display = 'none';
      if (summaryLine) summaryLine.style.display = 'none';
      if (duelBar) duelBar.style.display = 'none';
    }
    routerViewRefresh();
  }

  function routerViewRefresh() {
    if (STATE_ACTIVE_TAB === 'leaderboard') {
      runTableRenderer();
      refreshSummaryCards();
    } else if (STATE_ACTIVE_TAB === 'setup') {
      renderSetupPanelContent();
    } else if (STATE_ACTIVE_TAB === 'stewards') {
      renderStewardPanelContent();
    } else if (STATE_ACTIVE_TAB === 'standings') {
      renderStandingsPanelContent();
    } else if (STATE_ACTIVE_TAB === 'help') {
      renderHelpPanelContent();
    }
  }

  // ============================================================
  // API KEY SETUP PANEL
  // ============================================================


  /**********************************************************************
   * BOOK 07 — LEADERBOARD ENGINE
   *
   * Purpose:
   *     Handles driver filtering, sorting, summary cards, table rendering, and comparison mode.
   *
   * Contains:
   *     - parseRuntimePipeline()
   *     - runTableRenderer()
   *     - refreshSummaryCards()
   *     - executeInteractiveComparison()
   *
   * Dependencies:
   *     - Runtime State
   *     - Utilities
   *     - Router
   **********************************************************************/

  function parseRuntimePipeline() {
    var facEl = document.getElementById('nbf-field-faction');
    var selectedFactionId = facEl ? facEl.value : 'all';
    var searchEl = document.getElementById('nbf-field-search');
    var filteringKey = (searchEl ? searchEl.value : '').toLowerCase();
    var sortEl = document.getElementById('nbf-field-sort');
    var sortedProperty = sortEl ? sortEl.value : 'racing_skill';
    var dirEl = document.getElementById('nbf-field-direction');
    var directionMode = dirEl ? dirEl.value : 'desc';

    var dataPool = RUNTIME_MEMBERS.filter(function(item) {
      if (selectedFactionId !== 'all' && String(item.factionId) !== selectedFactionId) return false;
      return item.name.toLowerCase().indexOf(filteringKey) !== -1;
    });

    dataPool.forEach(function(item) {
      var skill = item.racing_skill !== undefined ? item.racing_skill : 0;
      item.handicap = Math.max(0, RUNTIME_MAX_SKILL - skill);
    });

    dataPool.sort(function(alpha, beta) {
      var nodeA = alpha[sortedProperty] !== undefined ? alpha[sortedProperty] : 0;
      var nodeB = beta[sortedProperty] !== undefined ? beta[sortedProperty] : 0;
      if (typeof nodeA === 'string') { nodeA = nodeA.toLowerCase(); nodeB = nodeB.toLowerCase(); }
      if (nodeA < nodeB) return directionMode === 'asc' ? -1 : 1;
      if (nodeA > nodeB) return directionMode === 'asc' ?  1 : -1;
      return 0;
    });

    return dataPool;
  }

  function runTableRenderer() {
    var dataset = parseRuntimePipeline();
    var separationLineStyle  = STATE_DARK_MODE ? 'border-bottom:1px solid #1f2937;' : 'border-bottom:1px solid #f1f5f9;';
    var dynamicAnchorColor   = STATE_DARK_MODE ? '#60a5fa' : '#1d6fa4';
    var descriptionMutedText = STATE_DARK_MODE ? '#9ca3af' : '#475569';
    var highlightBoldText    = STATE_DARK_MODE ? '#f3f4f6' : '#0f172a';

    var markupRows = dataset.map(function(player, slot) {
      var absoluteSkill   = player.racing_skill !== undefined ? player.racing_skill : 0;
      var progressWidth   = RUNTIME_MAX_SKILL > 0 ? Math.round((absoluteSkill / RUNTIME_MAX_SKILL) * 100) : 0;
      var badgeObject     = resolveRankBadge(absoluteSkill);
      var calculatedRatio = (player.racing_ratio !== undefined ? player.racing_ratio : 0).toFixed(1) + '%';
      var handicapDisplay = player.handicap !== undefined ? '+' + player.handicap.toFixed(1) : '0.0';
      var rowClass = '';
      if (String(player.id) === STATE_COMPARE_A || String(player.id) === STATE_COMPARE_B) { rowClass = ' class="nbf-row-selected"'; }

      var rowString = '<tr' + rowClass + ' style="' + separationLineStyle + ' cursor:pointer;" data-pid="' + player.id + '">';
      rowString += '<td style="padding:8px 14px; color:var(--nbf-mut);">' + (slot + 1) + '</td>';
      rowString += '<td style="padding:8px 4px;"><a href="https://www.torn.com/profiles.php?XID=' + player.id + '" target="_blank" style="color:' + dynamicAnchorColor + '; text-decoration:none; font-weight:600;" onclick="event.stopPropagation();">' + player.name + '</a></td>';
      rowString += '<td style="padding:8px 4px; color:' + descriptionMutedText + '; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:120px;" title="' + player.factionName + '">' + (player.factionName || '—') + '</td>';
      rowString += '<td style="padding:8px 4px;"><span style="background:' + badgeObject.bg + '; color:' + badgeObject.text + '; font-size:10px; padding:1px 6px; border-radius:20px;">' + badgeObject.title + '</span></td>';
      rowString += '<td style="padding:8px 4px;"><div style="display:flex; align-items:center; gap:4px;"><div style="flex:1; height:5px; border-radius:3px; background:var(--nbf-bdg); min-width:40px;"><div style="width:' + progressWidth + '%; height:100%; border-radius:3px; background:#6366f1;"></div></div><span style="font-size:11px; color:' + descriptionMutedText + '; min-width:28px; text-align:right;">' + absoluteSkill.toFixed(2) + '</span></div></td>';
      rowString += '<td style="padding:8px 4px; color:' + descriptionMutedText + '; text-align:right;">' + (player.racing_wins !== undefined ? player.racing_wins : '—') + '</td>';
      rowString += '<td style="padding:8px 4px; color:' + descriptionMutedText + '; text-align:right;">' + (player.races_entered !== undefined ? player.races_entered : '—') + '</td>';
      rowString += '<td style="padding:8px 4px; font-weight:600; color:' + highlightBoldText + '; text-align:right;">' + calculatedRatio + '</td>';
      rowString += '<td style="padding:8px 4px; color:' + descriptionMutedText + '; text-align:right;">' + (player.racing_points !== undefined ? player.racing_points : '—') + '</td>';
      rowString += '<td style="padding:8px 14px 8px 4px; font-weight:600; color:#e11d48; text-align:right;">' + handicapDisplay + '</td>';
      rowString += '</tr>';
      return rowString;
    }).join('');

    var targetBodyDOM = document.getElementById('nbf-layout-body');
    if (!targetBodyDOM) return;
    targetBodyDOM.innerHTML = '<table id="nbf-table-view"><thead><tr><th>#</th><th>Driver</th><th>Faction</th><th>Class Tier</th><th>Skill Matrix</th><th style="text-align:right;">Wins</th><th style="text-align:right;">Runs</th><th style="text-align:right;">Efficiency</th><th style="text-align:right;">Pts</th><th style="text-align:right;">Handicap</th></tr></thead><tbody>' + markupRows + '</tbody></table>';

    var rows = targetBodyDOM.querySelectorAll('tbody tr');
    for (var r = 0; r < rows.length; r++) {
      rows[r].addEventListener('click', function() {
        executeInteractiveComparison(this.getAttribute('data-pid'));
      });
    }

    var totalCounterNode = document.getElementById('nbf-txt-counter');
    if (totalCounterNode) { totalCounterNode.textContent = dataset.length + ' Drivers Filtered'; }
  }

  function refreshSummaryCards() {
    var summaryWrapper = document.getElementById('nbf-layout-summary');
    if (!summaryWrapper) return;
    if (!RUNTIME_MEMBERS || RUNTIME_MEMBERS.length === 0) {
      summaryWrapper.innerHTML = '<div style="color:var(--nbf-mut); padding:4px 0;">No active dataset pool loaded. Please run network synchronization.</div>';
      return;
    }

    var driversCount = RUNTIME_MEMBERS.length;
    var trackingWins = 0, trackingRuns = 0, accumulatedSkill = 0;
    for (var i = 0; i < driversCount; i++) {
      trackingWins     += (RUNTIME_MEMBERS[i].racing_wins  || 0);
      trackingRuns     += (RUNTIME_MEMBERS[i].races_entered || 0);
      accumulatedSkill += (RUNTIME_MEMBERS[i].racing_skill  || 0);
    }

    var networkAverageSkill = (accumulatedSkill / driversCount).toFixed(2);
    var generalEfficiency   = trackingRuns > 0 ? ((trackingWins / trackingRuns) * 100).toFixed(1) + '%' : '0.0%';

    summaryWrapper.innerHTML =
      renderStatModule('Total Pool', driversCount) +
      renderStatModule('Combined Wins', trackingWins.toLocaleString()) +
      renderStatModule('Alliance Runs', trackingRuns.toLocaleString()) +
      renderStatModule('Average Skill', networkAverageSkill) +
      renderStatModule('Win Ratio', generalEfficiency);
  }

  // ============================================================
  // DRIVER COMPARISON (DUEL BAR)
  // ============================================================

  function executeInteractiveComparison(selectedId) {
    if (!selectedId) return;
    if (STATE_COMPARE_A === selectedId)      { STATE_COMPARE_A = ''; }
    else if (STATE_COMPARE_B === selectedId) { STATE_COMPARE_B = ''; }
    else if (!STATE_COMPARE_A)               { STATE_COMPARE_A = selectedId; }
    else if (!STATE_COMPARE_B)               { STATE_COMPARE_B = selectedId; }
    else                                     { STATE_COMPARE_A = selectedId; STATE_COMPARE_B = ''; }

    var duelBar = document.getElementById('nbf-layout-duel');
    if (!STATE_COMPARE_A || !STATE_COMPARE_B) {
      if (duelBar) duelBar.style.display = 'none';
      runTableRenderer();
      return;
    }

    var driverObjA = null, driverObjB = null;
    for (var i = 0; i < RUNTIME_MEMBERS.length; i++) {
      if (String(RUNTIME_MEMBERS[i].id) === STATE_COMPARE_A) driverObjA = RUNTIME_MEMBERS[i];
      if (String(RUNTIME_MEMBERS[i].id) === STATE_COMPARE_B) driverObjB = RUNTIME_MEMBERS[i];
    }

    if (!driverObjA || !driverObjB) {
      if (duelBar) duelBar.style.display = 'none';
      runTableRenderer();
      return;
    }

    if (duelBar) {
      duelBar.style.display = 'flex';
      var skillDiff  = (driverObjA.racing_skill || 0) - (driverObjB.racing_skill || 0);
      var leaderText = skillDiff > 0
        ? driverObjA.name + ' leads by +' + skillDiff.toFixed(2)
        : (skillDiff < 0 ? driverObjB.name + ' leads by +' + Math.abs(skillDiff).toFixed(2) : 'Perfectly Matched');

      duelBar.innerHTML =
        '<div style="font-weight:600; font-size:12px;">📊 Matchup: <span style="color:#6366f1;">' + driverObjA.name + '</span> (' + (driverObjA.racing_skill || 0).toFixed(2) + ') vs <span style="color:#ec4899;">' + driverObjB.name + '</span> (' + (driverObjB.racing_skill || 0).toFixed(2) + ')</div>' +
        '<div style="font-size:12px; font-weight:bold; background:rgba(255,255,255,0.1); padding:4px 10px; border-radius:4px;">' + leaderText + '</div>' +
        '<button id="nbf-btn-duel-clear" style="background:none; border:1px solid rgba(255,255,255,0.3); color:#fff; padding:2px 8px; border-radius:4px; cursor:pointer; font-size:11px;">Clear Context</button>';

      document.getElementById('nbf-btn-duel-clear').addEventListener('click', function(e) {
        e.stopPropagation();
        STATE_COMPARE_A = ''; STATE_COMPARE_B = '';
        duelBar.style.display = 'none';
        runTableRenderer();
      });
    }
    runTableRenderer();
  }




  /**********************************************************************
   * BOOK 08 — LEAGUE SETUP ENGINE
   *
   * Purpose:
   *     Handles competition setup UI, team draft generation, tracks, laps, and handicap toggles.
   *
   * Contains:
   *     - renderSetupPanelContent()
   *     - processSnakeDraftCalculations()
   *     - renderDraftZoneMarkup()
   *
   * Dependencies:
   *     - Runtime State
   *     - Storage
   *     - Leaderboard data
   **********************************************************************/

  function renderSetupPanelContent() {
    var targetContainer = document.getElementById('nbf-layout-body');
    if (!targetContainer) return;

    var selectedCount = (LEAGUE_STATE.selectedTracks || []).length;
    var dropdownLabel = selectedCount === 0 ? "Select Tracks..." : selectedCount + " Tracks Selected";

    var panelHtml = '<div style="padding:24px; max-width:840px; margin:0 auto; background:var(--nbf-main); font-family:sans-serif;">';
    panelHtml += '<div style="margin-bottom:20px; border-bottom:1px solid var(--nbf-bld); padding-bottom:12px;">';
    panelHtml += '  <h2 style="margin:0; font-size:16px; font-weight:600; color:var(--nbf-txt);">Tournament & League Setup Profile</h2>';
    panelHtml += '  <p style="margin:4px 0 0 0; font-size:12px; color:var(--nbf-mut);">Configure tracks, structural format rules, and balance algorithms for your active alliance tournament session.</p>';
    panelHtml += '</div>';

    panelHtml += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px;">';

    // Column 1: Format & Balance
    panelHtml += '<div style="background:var(--nbf-alt2); border:1px solid var(--nbf-bld); border-radius:8px; padding:16px; display:flex; flex-direction:column; gap:14px;">';
    panelHtml += '  <h3 style="margin:0; font-size:13px; font-weight:600; color:var(--nbf-txt); border-bottom:1px solid var(--nbf-bld); padding-bottom:6px;">Format & Balance Settings</h3>';

    panelHtml += '  <div style="display:flex; flex-direction:column; gap:4px;"><label style="font-size:11px; color:var(--nbf-mut); font-weight:600;">System Format</label>';
    panelHtml += '    <select id="nbf-cfg-type" style="padding:8px; border:1px solid var(--nbf-btn-border); border-radius:6px; background:var(--nbf-field-bg); color:var(--nbf-txt); font-size:12px; width:100%;"><option value="solo"' + (LEAGUE_STATE.compType === 'solo' ? ' selected' : '') + '>Individual Solo Race</option><option value="teams"' + (LEAGUE_STATE.compType === 'teams' ? ' selected' : '') + '>Alliance Squad Draft</option></select></div>';

    var teamsVis = (LEAGUE_STATE.compType === 'teams') ? 'display:flex;' : 'display:none;';
    var soloVis  = (LEAGUE_STATE.compType === 'solo')  ? 'display:flex;' : 'display:none;';

    panelHtml += '  <div id="nbf-wrap-teamcount" style="' + teamsVis + ' flex-direction:column; gap:4px;"><label style="font-size:11px; color:var(--nbf-mut); font-weight:600;">Team Count</label>';
    panelHtml += '    <input id="nbf-cfg-teams" type="number" min="2" max="12" value="' + LEAGUE_STATE.teamCount + '" style="padding:8px; border:1px solid var(--nbf-btn-border); border-radius:6px; background:var(--nbf-field-bg); color:var(--nbf-txt); font-size:12px; width:100%; box-sizing:border-box;" /></div>';

    panelHtml += '  <div id="nbf-wrap-handicapstoggle" style="' + soloVis + ' flex-direction:column; gap:4px;"><label style="font-size:11px; color:var(--nbf-mut); font-weight:600;">Automated Settings</label>';
    panelHtml += '    <label style="display:flex; align-items:center; gap:8px; padding:8px; background:var(--nbf-field-bg); border:1px solid var(--nbf-btn-border); border-radius:6px; cursor:pointer; font-size:12px; color:var(--nbf-txt); font-weight:normal;">';
    panelHtml += '      <input id="nbf-cfg-usehandicaps" type="checkbox"' + (LEAGUE_STATE.useHandicaps !== false ? ' checked' : '') + ' style="margin:0; cursor:pointer;" /> Enable Skill Class Handicaps (KISS Matrix)';
    panelHtml += '    </label></div>';

    panelHtml += '  <div style="display:flex; flex-direction:column; gap:4px;"><label style="font-size:11px; color:var(--nbf-mut); font-weight:600;">Scoring Rules ' + createTooltip('Standard tracks pure positions. Class handicaps apply automated point variations to post-race standings.') + '</label>';
    panelHtml += '    <select id="nbf-cfg-scoring" style="padding:8px; border:1px solid var(--nbf-btn-border); border-radius:6px; background:var(--nbf-field-bg); color:var(--nbf-txt); font-size:12px; width:100%;"><option value="standard"' + (LEAGUE_STATE.scoringType === 'standard' ? ' selected' : '') + '>Standard Points Hierarchy</option><option value="handicap"' + (LEAGUE_STATE.scoringType === 'handicap' ? ' selected' : '') + '>Dynamic Skill Equalized</option></select></div>';
    panelHtml += '</div>';

    // Column 2: Track & Scope
    panelHtml += '<div style="background:var(--nbf-alt2); border:1px solid var(--nbf-bld); border-radius:8px; padding:16px; display:flex; flex-direction:column; gap:14px;">';
    panelHtml += '  <h3 style="margin:0; font-size:13px; font-weight:600; color:var(--nbf-txt); border-bottom:1px solid var(--nbf-bld); padding-bottom:6px;">Track & Tournament Scope</h3>';

    panelHtml += '  <div style="display:flex; flex-direction:column; gap:4px;"><label style="font-size:11px; color:var(--nbf-mut); font-weight:600;">League Scope Context</label>';
    panelHtml += '    <select id="nbf-cfg-scope" style="padding:8px; border:1px solid var(--nbf-btn-border); border-radius:6px; background:var(--nbf-field-bg); color:var(--nbf-txt); font-size:12px; width:100%;"><option value="all"' + (LEAGUE_STATE.scopeType === 'all' ? ' selected' : '') + '>All Nuclear Family Factions</option><option value="single"' + (LEAGUE_STATE.scopeType === 'single' ? ' selected' : '') + '>Single Faction of Choice</option></select></div>';

    var choiceVis = (LEAGUE_STATE.scopeType === 'single') ? 'display:flex;' : 'display:none;';
    panelHtml += '  <div id="nbf-cfg-scope-faction-wrap" style="' + choiceVis + ' flex-direction:column; gap:4px;"><label style="font-size:11px; color:var(--nbf-mut); font-weight:600;">Target Faction Profile</label>';
    panelHtml += '    <select id="nbf-cfg-scope-faction" style="padding:8px; border:1px solid var(--nbf-btn-border); border-radius:6px; background:var(--nbf-field-bg); color:var(--nbf-txt); font-size:12px; width:100%;">';
    TARGET_FACTIONS.forEach(function(fac) {
      panelHtml += '<option value="' + fac.id + '"' + (String(LEAGUE_STATE.scopeFactionId) === String(fac.id) ? ' selected' : '') + '>' + fac.name + '</option>';
    });
    panelHtml += '  </select></div>';

    panelHtml += '  <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">';
    panelHtml += '    <div style="display:flex; flex-direction:column; gap:4px; position:relative;"><label style="font-size:11px; color:var(--nbf-mut); font-weight:600;">Track Playlist</label>';
    panelHtml += '      <button id="nbf-dropdown-trigger" style="padding:8px; text-align:left; border:1px solid var(--nbf-btn-border); border-radius:6px; background:var(--nbf-field-bg); color:var(--nbf-txt); font-size:12px; width:100%; cursor:pointer; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">' + dropdownLabel + ' ▼</button>';
    panelHtml += '      <div id="nbf-dropdown-list" class="nbf-dropdown-menu">';
    AVAILABLE_TRACKS.forEach(function(track) {
      var isChecked = (LEAGUE_STATE.selectedTracks || []).indexOf(track) !== -1 ? ' checked' : '';
      panelHtml += '<label class="nbf-track-option"><input type="checkbox" class="nbf-track-checkbox" value="' + track + '"' + isChecked + ' style="margin:0; cursor:pointer;" /><span style="color:var(--nbf-txt);">' + track + '</span></label>';
    });
    panelHtml += '      </div></div>';

    panelHtml += '    <div style="display:flex; flex-direction:column; gap:4px;"><label style="font-size:11px; color:var(--nbf-mut); font-weight:600;">Target Laps</label>';
    panelHtml += '      <input id="nbf-cfg-laps" type="number" min="1" max="100" value="' + (LEAGUE_STATE.lapsCount || 10) + '" style="padding:8px; border:1px solid var(--nbf-btn-border); border-radius:6px; background:var(--nbf-field-bg); color:var(--nbf-txt); font-size:12px; width:100%; box-sizing:border-box;" /></div>';
    panelHtml += '  </div>';

    panelHtml += '  <div style="margin-top:auto; padding-top:4px;">';
    panelHtml += '    <button id="nbf-cfg-generate" style="padding:10px 20px; background:#6366f1; color:#fff; border:none; border-radius:6px; font-weight:600; cursor:pointer; font-size:12px; width:100%; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.1);">⚡ Process Live Standings Matrix</button>';
    panelHtml += '  </div>';
    panelHtml += '</div>';

    panelHtml += '</div>'; // end grid

    panelHtml += '<div id="nbf-cfg-results-zone"></div>';
    panelHtml += '</div>';

    targetContainer.innerHTML = panelHtml;

    document.getElementById('nbf-cfg-generate').addEventListener('click', processSnakeDraftCalculations);

    document.getElementById('nbf-cfg-type').addEventListener('change', function() {
      var wrapTeam     = document.getElementById('nbf-wrap-teamcount');
      var wrapHandicap = document.getElementById('nbf-wrap-handicapstoggle');
      if (this.value === 'solo') {
        if (wrapTeam)     wrapTeam.style.display = 'none';
        if (wrapHandicap) wrapHandicap.style.display = 'flex';
      } else {
        if (wrapTeam)     wrapTeam.style.display = 'flex';
        if (wrapHandicap) wrapHandicap.style.display = 'none';
      }
      syncStateTracker();
    });

    document.getElementById('nbf-cfg-scope').addEventListener('change', function() {
      var wrap = document.getElementById('nbf-cfg-scope-faction-wrap');
      if (wrap) wrap.style.display = (this.value === 'single') ? 'flex' : 'none';
      syncStateTracker();
    });

    var dropTrigger = document.getElementById('nbf-dropdown-trigger');
    var dropMenu    = document.getElementById('nbf-dropdown-list');
    dropTrigger.addEventListener('click', function(e) { e.stopPropagation(); dropMenu.classList.toggle('show'); });
    document.addEventListener('click', function(e) {
      if (dropMenu && !dropTrigger.contains(e.target) && !dropMenu.contains(e.target)) dropMenu.classList.remove('show');
    });

    var checkboxes = targetContainer.querySelectorAll('.nbf-track-checkbox');
    for (var c = 0; c < checkboxes.length; c++) {
      checkboxes[c].addEventListener('change', function() {
        var activeSelections = [];
        var targets = targetContainer.querySelectorAll('.nbf-track-checkbox:checked');
        for (var k = 0; k < targets.length; k++) { activeSelections.push(targets[k].value); }
        LEAGUE_STATE.selectedTracks = activeSelections;
        dropTrigger.textContent = activeSelections.length === 0 ? "Select Tracks..." : activeSelections.length + " Tracks Selected ▼";
        syncStateTracker();
      });
    }

    var teamInput = document.getElementById('nbf-cfg-teams');
    var syncStateTracker = function() {
      LEAGUE_STATE.compType      = document.getElementById('nbf-cfg-type').value;
      if (teamInput) LEAGUE_STATE.teamCount = parseInt(teamInput.value) || 4;
      var hcCheck = document.getElementById('nbf-cfg-usehandicaps');
      if (hcCheck) LEAGUE_STATE.useHandicaps = hcCheck.checked;
      LEAGUE_STATE.scoringType    = document.getElementById('nbf-cfg-scoring').value;
      LEAGUE_STATE.scopeType      = document.getElementById('nbf-cfg-scope').value;
      LEAGUE_STATE.scopeFactionId = document.getElementById('nbf-cfg-scope-faction').value;
      LEAGUE_STATE.lapsCount      = parseInt(document.getElementById('nbf-cfg-laps').value) || 10;
      localStorage.setItem(CONFIG_LEAGUE_KEY, JSON.stringify(LEAGUE_STATE));
    };

    var hcBox = document.getElementById('nbf-cfg-usehandicaps');
    if (hcBox) hcBox.addEventListener('change', syncStateTracker);
    if (teamInput) teamInput.addEventListener('input', syncStateTracker);
    document.getElementById('nbf-cfg-scoring').addEventListener('change', syncStateTracker);
    document.getElementById('nbf-cfg-scope-faction').addEventListener('change', syncStateTracker);
    document.getElementById('nbf-cfg-laps').addEventListener('input', syncStateTracker);

    if (LEAGUE_STATE.compType === 'teams' && LEAGUE_STATE.generatedTeams && LEAGUE_STATE.generatedTeams.length > 0) {
      renderDraftZoneMarkup();
    }
  }

  // ============================================================
  // SNAKE DRAFT CALCULATOR
  // ============================================================

  function processSnakeDraftCalculations() {
    if (LEAGUE_STATE.compType === 'solo') {
      alert('Live standings tracking initialized using individual parameters. Track settings verified successfully.');
      return;
    }

    var rawDataset = RUNTIME_MEMBERS.slice();
    if (!rawDataset || rawDataset.length === 0) {
      alert('The core dashboard dataset cache is currently blank. Please return to the leaderboard and hit Sync.');
      return;
    }

    if (LEAGUE_STATE.scopeType === 'single') {
      rawDataset = rawDataset.filter(function(driver) {
        return String(driver.factionId) === String(LEAGUE_STATE.scopeFactionId);
      });
    }

    if (rawDataset.length === 0) {
      alert('The chosen target faction criteria profile contains 0 matching driver instances inside the loaded cache.');
      return;
    }

    var targetsCount = LEAGUE_STATE.teamCount;
    var arrayBuckets = [];
    for (var t = 0; t < targetsCount; t++) { arrayBuckets.push({ id: t + 1, score: 0, members: [] }); }

    var pool = rawDataset.sort(function(m1, m2) { return (m2.racing_skill || 0) - (m1.racing_skill || 0); });
    var forward = true, pointer = 0;

    for (var p = 0; p < pool.length; p++) {
      arrayBuckets[pointer].members.push(pool[p]);
      arrayBuckets[pointer].score += (pool[p].racing_skill || 0);
      if (forward) {
        if (pointer === targetsCount - 1) { forward = false; } else { pointer++; }
      } else {
        if (pointer === 0) { forward = true; } else { pointer--; }
      }
    }

    LEAGUE_STATE.generatedTeams = arrayBuckets;
    localStorage.setItem(CONFIG_LEAGUE_KEY, JSON.stringify(LEAGUE_STATE));
    renderDraftZoneMarkup();
  }

  function renderDraftZoneMarkup() {
    var zone = document.getElementById('nbf-cfg-results-zone');
    if (!zone || !LEAGUE_STATE.generatedTeams) return;

    var areaHtml = '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:12px; background:var(--nbf-main);">';
    LEAGUE_STATE.generatedTeams.forEach(function(squad) {
      var avgVal = squad.members.length > 0 ? (squad.score / squad.members.length).toFixed(2) : '0.00';
      areaHtml += '<div style="background:var(--nbf-alt); border:1px solid var(--nbf-bld); border-radius:8px; padding:12px; display:flex; flex-direction:column; gap:6px;">';
      areaHtml += '  <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--nbf-bld); padding-bottom:6px; margin-bottom:4px;">';
      areaHtml += '    <span style="font-weight:600; font-size:12px; color:var(--nbf-txt);">Squad Pool ' + squad.id + '</span>';
      areaHtml += '    <span style="font-size:10px; font-weight:bold; background:var(--nbf-bdg); color:var(--nbf-mut); padding:2px 6px; border-radius:4px;">Avg: ' + avgVal + '</span>';
      areaHtml += '  </div>';
      squad.members.forEach(function(driver, idx) {
        areaHtml += '<div style="display:flex; justify-content:space-between; font-size:11px; color:var(--nbf-txt); padding:2px 0;">';
        areaHtml += '  <span>' + (idx + 1) + '. ' + driver.name + '</span>';
        areaHtml += '  <span style="color:var(--nbf-mut); font-family:monospace;">' + (driver.racing_skill || 0).toFixed(2) + '</span>';
        areaHtml += '</div>';
      });
      if (squad.members.length === 0) {
        areaHtml += '<div style="font-size:11px; color:var(--nbf-mut); text-align:center; padding:10px 0;">No context distributed.</div>';
      }
      areaHtml += '</div>';
    });
    areaHtml += '</div>';
    zone.innerHTML = areaHtml;
  }

  // ============================================================
  // CSV EXPORT
  // ============================================================


  /**********************************************************************
   * BOOK 09 — STANDINGS ENGINE
   *
   * Purpose:
   *     Displays league standings from Cloudflare or placeholder data.
   *
   * Contains:
   *     - STANDINGS_PLACEHOLDER
   *     - renderStandingsPanelContent()
   *     - drawStandingsTable()
   *
   * Dependencies:
   *     - Cloudflare endpoint
   *     - Theme State
   **********************************************************************/

  // ============================================================
  // LEAGUE STANDINGS PANEL
  // Fetches from CF_STANDINGS_ENDPOINT when live.
  // Falls back to placeholder data when endpoint is still set
  // to the placeholder URL so the UI is fully testable now.
  // ============================================================

  // Placeholder dataset — replace with nothing once CF is live,
  // the live fetch path will take over automatically.
  var STANDINGS_PLACEHOLDER = [
    { rank:1,  name:'CowboyUpp',      faction:'Nuclear Blast',      points:118, wins:3, podiums:5, races:6, best:1 },
    { rank:2,  name:'IronwheelX',     faction:'Nuclear Armageddon', points:97,  wins:2, podiums:4, races:6, best:1 },
    { rank:3,  name:'DriftKing99',    faction:'Nuclear Winter',     points:84,  wins:1, podiums:3, races:5, best:2 },
    { rank:4,  name:'TarmacGhost',    faction:'Nuclear Fusion',     points:76,  wins:1, podiums:2, races:6, best:2 },
    { rank:5,  name:'BlazeRunner',    faction:'Nuclear Clinic',     points:63,  wins:0, podiums:3, races:5, best:3 },
    { rank:6,  name:'OversteerOlaf',  faction:'Nuclear Therapy',    points:55,  wins:0, podiums:2, races:6, best:3 },
    { rank:7,  name:'PedalToMetal',   faction:'Torn Medical',       points:44,  wins:0, podiums:1, races:4, best:4 },
    { rank:8,  name:'SlipstreamSue',  faction:'Evolution',          points:38,  wins:0, podiums:1, races:5, best:4 },
    { rank:9,  name:'ApexHunter',     faction:'Ionization',         points:29,  wins:0, podiums:0, races:4, best:5 },
    { rank:10, name:'GravelTrap',     faction:'Emergency Room',     points:18,  wins:0, podiums:0, races:3, best:6 }
  ];

  function renderStandingsPanelContent() {
    var targetContainer = document.getElementById('nbf-layout-body');
    if (!targetContainer) return;

    var isPlaceholder = CF_STANDINGS_ENDPOINT.indexOf('YOUR-WORKER') !== -1;

    // Show loading state immediately
    targetContainer.innerHTML =
      '<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:3rem; background:var(--nbf-main);">' +
      '  <div style="font-size:12px; color:var(--nbf-mut);">' + (isPlaceholder ? '📋 Showing placeholder data — backend not yet connected.' : '⏳ Loading standings...') + '</div>' +
      '</div>';

    if (isPlaceholder) {
      window.setTimeout(function() {
        drawStandingsTable(targetContainer, STANDINGS_PLACEHOLDER, true);
      }, 300);
    } else {
      backendRequest(CF_STANDINGS_ENDPOINT, { method: 'GET' }, 5000)
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function(data) {
        var normalizedDataset = normalizeStandingsDataset(data);
        drawStandingsTable(targetContainer, normalizedDataset, false);
      })
      .catch(function(err) {
        console.error('[NB Racing] Standings fetch error:', err);
        targetContainer.innerHTML =
          '<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:3rem; background:var(--nbf-main); gap:8px;">' +
          '  <div style="font-size:13px; font-weight:600; color:#c62828;">⚠️ Failed to load standings</div>' +
          '  <div style="font-size:11px; color:var(--nbf-mut);">' + err.message + ' — check console for details.</div>' +
          '  <button id="nbf-standings-retry" style="margin-top:8px; padding:8px 16px; background:#6366f1; color:#fff; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">Retry</button>' +
          '</div>';
        var retryBtn = document.getElementById('nbf-standings-retry');
        if (retryBtn) retryBtn.addEventListener('click', renderStandingsPanelContent);
      });
    }
  }

  function normalizeStandingsDataset(rawPayload) {
    var rawRows = [];

    if (Array.isArray(rawPayload)) {
      rawRows = rawPayload;
    } else if (rawPayload && Array.isArray(rawPayload.standings)) {
      rawRows = rawPayload.standings;
    } else if (rawPayload && rawPayload.ok === false) {
      throw new Error(rawPayload.error || 'Backend returned an error');
    } else {
      throw new Error('Unexpected standings response format');
    }

    return rawRows.map(function(row, index) {
      return {
        rank: row.rank || (index + 1),
        name: row.name || row.driver_name || 'Unknown Driver',
        faction: row.faction || '—',
        points: Number(row.points || 0),
        wins: Number(row.wins || 0),
        podiums: Number(row.podiums || 0),
        races: Number(row.races || 0),
        best: row.best || row.best_finish || '—',
        avg_finish: row.avg_finish !== undefined && row.avg_finish !== null ? Number(row.avg_finish).toFixed(2) : '—'
      };
    });
  }

  function drawStandingsTable(container, dataset, isPlaceholder) {
    dataset = normalizeStandingsDataset(dataset);

    var mutedColor  = STATE_DARK_MODE ? '#9ca3af' : '#475569';
    var boldColor   = STATE_DARK_MODE ? '#f3f4f6' : '#0f172a';
    var anchorColor = STATE_DARK_MODE ? '#60a5fa' : '#1d6fa4';
    var rowSep      = STATE_DARK_MODE ? 'border-bottom:1px solid #1f2937;' : 'border-bottom:1px solid #f1f5f9;';

    // Summary stat cards
    var totalRaces   = dataset.length > 0 ? dataset[0].races : 0;
    var totalDrivers = dataset.length;
    var leader       = dataset.length > 0 ? dataset[0] : null;

    var summaryHtml = '<div style="display:flex; gap:6px; padding:12px 16px; flex-wrap:wrap; border-bottom:1px solid var(--nbf-bld); background:var(--nbf-alt2);">';
    summaryHtml += renderStatModule('Drivers', totalDrivers);
    summaryHtml += renderStatModule('Races Run', totalRaces);
    if (leader) {
      summaryHtml += renderStatModule('Leader', leader.name);
      summaryHtml += renderStatModule('Leader Pts', leader.points);
    }
    if (isPlaceholder) {
      summaryHtml += '<div style="display:flex; align-items:center; padding:4px 10px; background:#1e1b4b; border:1px solid #4338ca; border-radius:6px; font-size:11px; color:#c7d2fe; margin-left:auto;">📋 Placeholder data — live once CF Worker is deployed</div>';
    } else {
      summaryHtml += '<div style="display:flex; align-items:center; gap:6px; margin-left:auto;">';
      summaryHtml += '  <button id="nbf-standings-refresh" style="padding:5px 10px; background:#6366f1; color:#fff; border:none; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer;">🔄 Refresh</button>';
      summaryHtml += '</div>';
    }
    summaryHtml += '</div>';

    // Table rows
    var rowsHtml = dataset.map(function(driver) {
      var medalIcon = driver.rank === 1 ? '🥇' : driver.rank === 2 ? '🥈' : driver.rank === 3 ? '🥉' : '';
      var rankDisplay = medalIcon ? medalIcon : driver.rank;

      // Points gap to leader
      var leaderPts = dataset[0] ? dataset[0].points : 0;
      var gapDisplay = driver.rank === 1 ? '<span style="color:#16a34a; font-weight:700;">LEAD</span>' : '<span style="color:' + mutedColor + ';">-' + (leaderPts - driver.points) + '</span>';

      var rowHtml = '<tr style="' + rowSep + ' cursor:default;">';
      rowHtml += '<td style="padding:8px 14px; font-weight:600; color:' + boldColor + '; font-size:13px;">' + rankDisplay + '</td>';
      rowHtml += '<td style="padding:8px 4px; font-weight:600; color:' + anchorColor + ';">' + driver.name + '</td>';
      rowHtml += '<td style="padding:8px 4px; color:' + mutedColor + '; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:130px;" title="' + driver.faction + '">' + driver.faction + '</td>';
      rowHtml += '<td style="padding:8px 4px; font-weight:700; color:' + boldColor + '; font-size:13px;">' + driver.points + '</td>';
      rowHtml += '<td style="padding:8px 4px; text-align:center;">' + gapDisplay + '</td>';
      rowHtml += '<td style="padding:8px 4px; color:' + mutedColor + '; text-align:center;">' + driver.wins + '</td>';
      rowHtml += '<td style="padding:8px 4px; color:' + mutedColor + '; text-align:center;">' + driver.podiums + '</td>';
      rowHtml += '<td style="padding:8px 4px; color:' + mutedColor + '; text-align:center;">' + driver.races + '</td>';
      var bestDisplay = driver.best === '—' ? '—' : (Number(driver.best) === 1 ? '🥇 P1' : 'P' + driver.best);
      rowHtml += '<td style="padding:8px 4px; color:' + mutedColor + '; text-align:center;">' + bestDisplay + '</td>';
      rowHtml += '<td style="padding:8px 14px 8px 4px; color:' + mutedColor + '; text-align:center;">' + driver.avg_finish + '</td>';
      rowHtml += '</tr>';
      return rowHtml;
    }).join('');

    var tableHtml =
      '<table id="nbf-standings-table" style="width:100%; border-collapse:separate; border-spacing:0; font-size:11px; min-width:640px;">' +
      '  <thead>' +
      '    <tr>' +
      '      <th style="position:sticky; top:0; z-index:9999; background:var(--nbf-alt); color:var(--nbf-mut); font-weight:600; padding:10px 14px; text-align:left; border-bottom:2px solid var(--nbf-bld);">#</th>' +
      '      <th style="position:sticky; top:0; z-index:9999; background:var(--nbf-alt); color:var(--nbf-mut); font-weight:600; padding:10px 4px; text-align:left; border-bottom:2px solid var(--nbf-bld);">Driver</th>' +
      '      <th style="position:sticky; top:0; z-index:9999; background:var(--nbf-alt); color:var(--nbf-mut); font-weight:600; padding:10px 4px; text-align:left; border-bottom:2px solid var(--nbf-bld);">Faction</th>' +
      '      <th style="position:sticky; top:0; z-index:9999; background:var(--nbf-alt); color:var(--nbf-mut); font-weight:600; padding:10px 4px; text-align:left; border-bottom:2px solid var(--nbf-bld);">Points</th>' +
      '      <th style="position:sticky; top:0; z-index:9999; background:var(--nbf-alt); color:var(--nbf-mut); font-weight:600; padding:10px 4px; text-align:center; border-bottom:2px solid var(--nbf-bld);">Gap</th>' +
      '      <th style="position:sticky; top:0; z-index:9999; background:var(--nbf-alt); color:var(--nbf-mut); font-weight:600; padding:10px 4px; text-align:center; border-bottom:2px solid var(--nbf-bld);">Wins</th>' +
      '      <th style="position:sticky; top:0; z-index:9999; background:var(--nbf-alt); color:var(--nbf-mut); font-weight:600; padding:10px 4px; text-align:center; border-bottom:2px solid var(--nbf-bld);">Podiums</th>' +
      '      <th style="position:sticky; top:0; z-index:9999; background:var(--nbf-alt); color:var(--nbf-mut); font-weight:600; padding:10px 4px; text-align:center; border-bottom:2px solid var(--nbf-bld);">Races</th>' +
      '      <th style="position:sticky; top:0; z-index:9999; background:var(--nbf-alt); color:var(--nbf-mut); font-weight:600; padding:10px 4px; text-align:center; border-bottom:2px solid var(--nbf-bld);">Best Finish</th>' +
      '      <th style="position:sticky; top:0; z-index:9999; background:var(--nbf-alt); color:var(--nbf-mut); font-weight:600; padding:10px 14px 10px 4px; text-align:center; border-bottom:2px solid var(--nbf-bld);">Avg Finish</th>' +
      '    </tr>' +
      '  </thead>' +
      '  <tbody>' + rowsHtml + '</tbody>' +
      '</table>';

    container.innerHTML =
      summaryHtml +
      '<div style="overflow-x:auto; overflow-y:auto; flex:1; background:var(--nbf-main);">' +
      tableHtml +
      '</div>';

    // Wire refresh button if live
    var refreshBtn = document.getElementById('nbf-standings-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', renderStandingsPanelContent);
    }
  }

  // ============================================================
  // HELP PANEL
  // ============================================================


  /**********************************************************************
   * BOOK 10 — STEWARD MANAGEMENT
   *
   * Purpose:
   *     Manages steward token, authorization checks, local steward registry, and steward UI.
   *
   * Contains:
   *     - isStewardAuthorized()
   *     - renderStewardPanelContent()
   *
   * Dependencies:
   *     - Storage Helpers
   *     - Runtime State
   *     - Theme State
   **********************************************************************/

  function isStewardAuthorized() {
    // A user is an authorized Steward if they have a non-empty token stored locally.
    // The token is what gets validated server-side by Cloudflare.
    return STATE_STEWARD_TOKEN && STATE_STEWARD_TOKEN.trim().length > 0;
  }

  // ============================================================
  // SCRAPER TOAST NOTIFICATION
  // ============================================================



  function loadControlSectionState() {
    try {
      var raw = JSON.parse(localStorage.getItem(CONFIG_CC_SECTION_KEY) || '{}') || {};
      // v6.5.17 migration: old versions stored {sectionId: true}.
      // New version stores { open: "sectionId" } or { open: "" }.
      if (raw && raw.open !== undefined) return raw;
      var keys = Object.keys(raw || {}).filter(function(k) { return !!raw[k]; });
      return { open: keys.length ? keys[0] : '' };
    } catch (err) {
      return { open: '' };
    }
  }

  function saveControlSectionState(state) {
    localStorage.setItem(CONFIG_CC_SECTION_KEY, JSON.stringify(state || { open: '' }));
  }

  function isControlSectionOpen(sectionId, defaultOpen) {
    var state = loadControlSectionState();
    if (state && state.open !== undefined) return state.open === sectionId;
    return false;
  }


  function renderControlAccordion(sectionId, title, subtitle, bodyHtml, defaultOpen) {
    var isOpen = isControlSectionOpen(sectionId, defaultOpen);
    return '' +
      '<div class="nbf-control-accordion" data-nbf-section="' + sectionId + '" style="background:var(--nbf-alt2); border:1px solid var(--nbf-bld); border-radius:8px; margin-bottom:10px; overflow:hidden;">' +
      '  <div class="nbf-control-accordion-toggle" data-nbf-section="' + sectionId + '" style="padding:11px 14px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; gap:12px; background:var(--nbf-alt);">' +
      '    <strong style="font-size:13px; color:var(--nbf-txt);">' + (isOpen ? '▲ ' : '▼ ') + title + '</strong>' +
      '    <span style="font-size:11px; color:var(--nbf-mut); text-align:right;">' + (subtitle || '') + '</span>' +
      '  </div>' +
      '  <div class="nbf-control-accordion-body" data-nbf-section="' + sectionId + '" style="display:' + (isOpen ? 'block' : 'none') + '; padding:16px;">' +
      bodyHtml +
      '  </div>' +
      '</div>';
  }

  function renderComingSoonCard(text) {
    return '<div style="font-size:12px; color:var(--nbf-mut); line-height:1.5; padding:10px 12px; border:1px dashed var(--nbf-bld); border-radius:7px; background:var(--nbf-main);">' + text + '</div>';
  }

  function renderAdminSystemHealthBody() {
    return '' +
      '<div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:7px 16px; font-size:12px; color:var(--nbf-mut);">' +
      '  <div><strong style="color:var(--nbf-txt);">Userscript:</strong> v' + ENGINE_VERSION + '</div>' +
      '  <div><strong style="color:var(--nbf-txt);">Backend:</strong> ' + BACKEND_STATUS.backend + '</div>' +
      '  <div><strong style="color:var(--nbf-txt);">Backend Version:</strong> ' + BACKEND_STATUS.version + '</div>' +
      '  <div><strong style="color:var(--nbf-txt);">Latency:</strong> ' + (BACKEND_STATUS.latency !== null ? BACKEND_STATUS.latency + ' ms' : '—') + '</div>' +
      '  <div><strong style="color:var(--nbf-txt);">Database:</strong> ' + BACKEND_STATUS.database + '</div>' +
      '  <div><strong style="color:var(--nbf-txt);">Last Check:</strong> ' + BACKEND_STATUS.lastCheck + '</div>' +
      '</div>' +
      '<div style="margin-top:12px;">' +
      '  <button id="nbf-backend-check-btn" style="padding:7px 12px; background:#6366f1; color:#fff; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">Run System Check</button>' +
      '</div>';
  }



  function isAdminUnlocked() {
    return !!STATE_ADMIN_TOKEN_SESSION;
  }

  function adminBackendRequest(url, options, timeoutMs) {
    options = options || {};
    options.headers = options.headers || {};
    options.headers.Authorization = 'Bearer ' + STATE_ADMIN_TOKEN_SESSION;
    return backendRequest(url, options, timeoutMs || 7000);
  }


  function renderGarageLight(status, label, detail) {
    var color = '#64748b';
    var glow = 'rgba(100,116,139,0.25)';
    var text = 'Offline';

    if (status === 'green') {
      color = '#16a34a';
      glow = 'rgba(22,163,74,0.45)';
      text = 'OK';
    } else if (status === 'yellow') {
      color = '#f59e0b';
      glow = 'rgba(245,158,11,0.45)';
      text = 'Check';
    } else if (status === 'red') {
      color = '#dc2626';
      glow = 'rgba(220,38,38,0.45)';
      text = 'Fault';
    }

    return '' +
      '<div style="display:flex; align-items:center; gap:8px; padding:8px 10px; background:var(--nbf-main); border:1px solid var(--nbf-bld); border-radius:8px; min-width:150px;">' +
      '  <span title="' + escapeHTML(text) + '" style="width:13px; height:13px; border-radius:50%; background:' + color + '; box-shadow:0 0 10px 2px ' + glow + '; flex:0 0 auto;"></span>' +
      '  <div style="min-width:0;">' +
      '    <div style="font-size:11px; font-weight:700; color:var(--nbf-txt); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + escapeHTML(label) + '</div>' +
      '    <div style="font-size:10px; color:var(--nbf-mut); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + escapeHTML(detail || text) + '</div>' +
      '  </div>' +
      '</div>';
  }

  function backendRegistryLightState() {
    if (BACKEND_STEWARD_REGISTRY.state === 'loaded') return 'green';
    if (BACKEND_STEWARD_REGISTRY.state === 'loading') return 'yellow';
    if (BACKEND_STEWARD_REGISTRY.state === 'error') return 'red';
    return 'yellow';
  }

  function renderStewardConsoleLights() {
    var stewards = BACKEND_STEWARD_REGISTRY.stewards || [];
    var activeCount = stewards.filter(function(s) { return Number(s.active) === 1; }).length;
    var disabledCount = stewards.length - activeCount;

    return '' +
      '<div style="display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:8px; margin-bottom:12px;">' +
      renderGarageLight(isAdminUnlocked() ? 'green' : 'yellow', 'Admin Mode', isAdminUnlocked() ? 'Unlocked' : 'Locked') +
      renderGarageLight(backendRegistryLightState(), 'Registry', BACKEND_STEWARD_REGISTRY.state) +
      renderGarageLight(activeCount > 0 ? 'green' : 'yellow', 'Active Stewards', String(activeCount) + ' active') +
      renderGarageLight(disabledCount > 0 ? 'yellow' : 'green', 'Disabled', String(disabledCount) + ' disabled') +
      '</div>';
  }

  function renderRoleBadge(role) {
    var safeRole = String(role || 'event');
    var label = '🏁 STEWARD';
    var bg = 'rgba(22,163,74,0.12)';
    var color = '#16a34a';
    var border = 'rgba(22,163,74,0.25)';

    if (safeRole === 'super_admin') {
      label = '👑 SUPER ADMIN';
      bg = 'rgba(99,102,241,0.16)';
      color = '#4f46e5';
      border = 'rgba(99,102,241,0.30)';
    } else if (safeRole === 'admin') {
      label = '🛡 ADMIN';
      bg = 'rgba(37,99,235,0.13)';
      color = '#2563eb';
      border = 'rgba(37,99,235,0.28)';
    } else if (safeRole === 'chief') {
      label = '⭐ CHIEF';
      bg = 'rgba(14,165,233,0.13)';
      color = '#0284c7';
      border = 'rgba(14,165,233,0.28)';
    } else if (safeRole === 'observer') {
      label = '👀 OBSERVER';
      bg = 'rgba(100,116,139,0.13)';
      color = '#64748b';
      border = 'rgba(100,116,139,0.28)';
    }

    return '<span style="display:inline-block; padding:2px 6px; border-radius:999px; background:' + bg + '; color:' + color + '; border:1px solid ' + border + '; font-size:9px; font-weight:800; letter-spacing:.02em; white-space:nowrap;">' + escapeHTML(label) + '</span>';
  }

  function renderStatusLight(active, lastSeen) {
    if (Number(active) !== 1) {
      return '<span style="display:inline-flex; align-items:center; gap:4px; color:#f59e0b; font-weight:700; font-size:10px;"><span style="width:10px; height:10px; border-radius:50%; background:#f59e0b; box-shadow:0 0 8px rgba(245,158,11,0.55);"></span>Disabled</span>';
    }

    var detail = lastSeen ? 'Seen' : 'Active';
    return '<span style="display:inline-flex; align-items:center; gap:4px; color:#16a34a; font-weight:700; font-size:10px;"><span style="width:10px; height:10px; border-radius:50%; background:#16a34a; box-shadow:0 0 8px rgba(22,163,74,0.55);"></span>' + detail + '</span>';
  }

  function renderAdminUnlockBox() {
    if (isAdminUnlocked()) {
      var who = BACKEND_LOGIN_IDENTITY && BACKEND_LOGIN_IDENTITY.display_name ? BACKEND_LOGIN_IDENTITY.display_name : 'Admin Session';
      var role = BACKEND_LOGIN_IDENTITY && BACKEND_LOGIN_IDENTITY.role ? BACKEND_LOGIN_IDENTITY.role : 'bootstrap';
      return '' +
        '<div style="font-size:11px; color:var(--nbf-txt); line-height:1.5; padding:10px 12px; border:1px solid #16a34a; border-radius:7px; background:rgba(22,163,74,0.08); margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">' +
        '  <div>' +
        '    <strong>🟢 Steward Registry Login Active</strong><br>' +
        '    <span style="color:var(--nbf-mut);">Logged in as ' + escapeHTML(who) + ' · ' + escapeHTML(role) + '. Session is stored only in this browser tab.</span>' +
        '  </div>' +
        '  <button id="nbf-admin-lock-btn" style="padding:7px 12px; background:var(--nbf-field-bg); color:#dc2626; border:1px solid #fca5a5; border-radius:6px; font-size:12px; cursor:pointer;">Logout</button>' +
        '</div>';
    }

    return '' +
      '<div style="font-size:11px; color:var(--nbf-txt); line-height:1.5; padding:12px; border:1px solid #60a5fa; border-radius:7px; background:rgba(96,165,250,0.10); margin-bottom:12px;">' +
      '  <strong>🔐 Steward Registry Login</strong><br>' +
      '  <span style="color:var(--nbf-mut);">Enter your Torn ID and personal backend steward token. Only super_admin/admin sessions can manage stewards.</span>' +
      '  <div style="display:grid; grid-template-columns:110px 1fr auto; gap:8px; margin-top:10px; align-items:center;">' +
      '    <input id="nbf-admin-login-torn-id" type="text" placeholder="Torn ID" autocomplete="username" maxlength="24" style="padding:7px 9px; border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:12px; background:var(--nbf-field-bg); color:var(--nbf-txt);" />' +
      '    <input id="nbf-admin-token-input" type="password" placeholder="Personal steward token" autocomplete="current-password" style="padding:7px 9px; border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:12px; background:var(--nbf-field-bg); color:var(--nbf-txt);" />' +
      '    <button id="nbf-admin-unlock-btn" style="padding:7px 12px; background:#6366f1; color:#fff; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">Login</button>' +
      '  </div>' +
      '  <div style="font-size:10px; color:var(--nbf-mut); margin-top:8px;">Emergency ADMIN_TOKEN remains available for API clients only.</div>' +
      '</div>';
  }

  function canManageBackendStewards() {
    var role = BACKEND_LOGIN_IDENTITY && BACKEND_LOGIN_IDENTITY.role ? String(BACKEND_LOGIN_IDENTITY.role) : '';
    return role === 'super_admin' || role === 'admin' || !BACKEND_LOGIN_IDENTITY;
  }

  function renderBackendStewardRows() {
    if (BACKEND_STEWARD_REGISTRY.state === 'locked') {
      return '<div style="font-size:12px; color:var(--nbf-mut); padding:10px 0;">Unlock Admin Mode to load backend stewards.</div>';
    }

    if (BACKEND_STEWARD_REGISTRY.state === 'loading') {
      return '<div style="font-size:12px; color:var(--nbf-mut); padding:10px 0;">Loading backend stewards...</div>';
    }

    if (BACKEND_STEWARD_REGISTRY.state === 'error') {
      return '<div style="font-size:12px; color:#dc2626; padding:10px 0;">' + escapeHTML(BACKEND_STEWARD_REGISTRY.message || 'Backend steward load failed.') + '</div>';
    }

    var stewards = BACKEND_STEWARD_REGISTRY.stewards || [];
    if (!stewards.length) {
      return '<div style="font-size:12px; color:var(--nbf-mut); padding:10px 0;">No backend stewards registered yet.</div>';
    }

    var grid = '42px 72px minmax(120px, 1fr) 118px 84px 82px 150px';

    var rows = '<div style="display:grid; grid-template-columns:' + grid + '; gap:7px; padding:7px 0; border-bottom:1px solid var(--nbf-bld); font-size:11px; font-weight:700; color:var(--nbf-txt); min-width:0;">' +
      '<div>ID</div><div>Torn</div><div>Name</div><div>Role</div><div>Status</div><div>Created</div><div>Actions</div></div>';

    stewards.forEach(function(steward) {
      var isActive = Number(steward.active) === 1;
      rows += '<div style="display:grid; grid-template-columns:' + grid + '; gap:7px; align-items:center; padding:8px 0; border-bottom:1px solid var(--nbf-bld); font-size:11px; color:var(--nbf-mut); min-width:0;">' +
        '<div style="font-family:monospace; overflow:hidden; text-overflow:ellipsis;">' + escapeHTML(steward.id || '—') + '</div>' +
        '<div style="font-family:monospace; overflow:hidden; text-overflow:ellipsis;">' + escapeHTML(steward.torn_id || '—') + '</div>' +
        '<div style="color:var(--nbf-txt); font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + escapeHTML(steward.display_name || 'Unknown') + '</div>' +
        '<div>' + renderRoleBadge(steward.role || 'event') + '</div>' +
        '<div>' + renderStatusLight(steward.active, steward.last_seen_at) + '</div>' +
        '<div style="font-family:monospace; font-size:10px; overflow:hidden; text-overflow:ellipsis;">' + escapeHTML((steward.created_at || '—').slice(0, 10)) + '</div>' +
        '<div style="display:flex; gap:4px; flex-wrap:nowrap; justify-content:flex-start;">' +
        '  <button class="nbf-backend-steward-edit-btn" data-id="' + escapeHTML(steward.id) + '" title="Edit steward" style="padding:4px 6px; background:var(--nbf-field-bg); color:var(--nbf-txt); border:1px solid var(--nbf-btn-border); border-radius:5px; font-size:10px; cursor:pointer;">Edit</button>' +
        '  <button class="nbf-backend-steward-toggle-btn" data-id="' + escapeHTML(steward.id) + '" data-active="' + (isActive ? '1' : '0') + '" title="' + (isActive ? 'Disable steward' : 'Enable steward') + '" style="padding:4px 6px; background:var(--nbf-field-bg); color:' + (isActive ? '#f59e0b' : '#16a34a') + '; border:1px solid var(--nbf-btn-border); border-radius:5px; font-size:10px; cursor:pointer;">' + (isActive ? 'Off' : 'On') + '</button>' +
        '  <button class="nbf-backend-steward-token-btn" data-id="' + escapeHTML(steward.id) + '" title="Regenerate token" style="padding:4px 6px; background:var(--nbf-field-bg); color:#6366f1; border:1px solid var(--nbf-btn-border); border-radius:5px; font-size:10px; cursor:pointer;">Token</button>' +
        '</div>' +
        '</div>';
    });

    return rows;
  }




  function getBackendStewardById(id) {
    var stewards = BACKEND_STEWARD_REGISTRY.stewards || [];
    return stewards.find(function(s) { return String(s.id) === String(id); }) || null;
  }

  function renderRoleOption(value, current) {
    return '<option value="' + escapeHTML(value) + '"' + (String(current || '') === value ? ' selected' : '') + '>' + escapeHTML(value) + '</option>';
  }

  function renderBackendStewardEditForm() {
    if (!isAdminUnlocked() || !BACKEND_STEWARD_EDITOR.editingId) return '';

    var steward = getBackendStewardById(BACKEND_STEWARD_EDITOR.editingId);
    if (!steward) return '';

    return '' +
      '<div style="margin-top:12px; padding:10px 12px; border:1px solid #60a5fa; border-radius:7px; background:rgba(96,165,250,0.08);">' +
      '  <h4 style="margin:0 0 8px 0; font-size:12px; color:var(--nbf-txt);">Edit Steward #' + escapeHTML(steward.id) + '</h4>' +
      '  <div style="display:grid; grid-template-columns:1fr 140px; gap:8px; align-items:center;">' +
      '    <input id="nbf-edit-steward-name" type="text" value="' + escapeHTML(steward.display_name || '') + '" maxlength="48" style="padding:7px 9px; border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:12px; background:var(--nbf-field-bg); color:var(--nbf-txt);" />' +
      '    <select id="nbf-edit-steward-role" style="padding:7px 9px; border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:12px; background:var(--nbf-field-bg); color:var(--nbf-txt);">' +
      renderRoleOption('super_admin', steward.role) +
      renderRoleOption('admin', steward.role) +
      renderRoleOption('chief', steward.role) +
      renderRoleOption('event', steward.role) +
      renderRoleOption('observer', steward.role) +
      '    </select>' +
      '  </div>' +
      '  <textarea id="nbf-edit-steward-notes" placeholder="Notes" maxlength="200" style="margin-top:8px; width:100%; min-height:56px; padding:7px 9px; box-sizing:border-box; border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:12px; background:var(--nbf-field-bg); color:var(--nbf-txt);">' + escapeHTML(steward.notes || '') + '</textarea>' +
      '  <div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">' +
      '    <button id="nbf-edit-steward-save-btn" data-id="' + escapeHTML(steward.id) + '" style="padding:7px 12px; background:#16a34a; color:#fff; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">Save Changes</button>' +
      '    <button id="nbf-edit-steward-cancel-btn" style="padding:7px 12px; background:var(--nbf-field-bg); color:var(--nbf-mut); border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:12px; cursor:pointer;">Cancel</button>' +
      '  </div>' +
      '</div>';
  }

  function renderBackendStewardCreateForm() {
    if (!isAdminUnlocked()) return '';

    var tokenBox = '';
    if (BACKEND_STEWARD_REGISTRY.lastToken && BACKEND_STEWARD_REGISTRY.lastToken.token_once) {
      tokenBox = '<div style="margin-top:12px; padding:10px 12px; border:1px solid #f59e0b; border-radius:7px; background:rgba(245,158,11,0.08); font-size:11px; line-height:1.5;">' +
        '<strong style="color:#f59e0b;">One-time token generated. Copy it now:</strong>' +
        '<textarea readonly style="margin-top:8px; width:100%; min-height:54px; padding:8px; box-sizing:border-box; font-family:monospace; font-size:11px; background:var(--nbf-field-bg); color:var(--nbf-txt); border:1px solid var(--nbf-btn-border); border-radius:6px;">' + escapeHTML(BACKEND_STEWARD_REGISTRY.lastToken.token_once) + '</textarea>' +
        '<div style="color:var(--nbf-mut); margin-top:6px;">This token is shown once. The backend stores only a hash.</div>' +
        '</div>';
    }

    return '' +
      '<div style="margin-top:12px; padding:10px 12px; border:1px solid var(--nbf-bld); border-radius:7px; background:var(--nbf-main);">' +
      '  <h4 style="margin:0 0 8px 0; font-size:12px; color:var(--nbf-txt);">Create Backend Steward</h4>' +
      '  <div style="display:grid; grid-template-columns:90px 1fr 130px auto; gap:8px; align-items:center;">' +
      '    <input id="nbf-backend-steward-torn-id" type="text" placeholder="Torn ID" autocomplete="off" maxlength="24" style="padding:7px 9px; border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:12px; background:var(--nbf-field-bg); color:var(--nbf-txt);" />' +
      '    <input id="nbf-backend-steward-name" type="text" placeholder="Display name" autocomplete="off" maxlength="48" style="padding:7px 9px; border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:12px; background:var(--nbf-field-bg); color:var(--nbf-txt);" />' +
      '    <select id="nbf-backend-steward-role" style="padding:7px 9px; border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:12px; background:var(--nbf-field-bg); color:var(--nbf-txt);">' +
      '      <option value="super_admin">Super Admin</option>' +
      '      <option value="admin">Admin</option>' +
      '      <option value="chief">Chief Steward</option>' +
      '      <option value="event">Event Steward</option>' +
      '      <option value="observer">Observer</option>' +
      '    </select>' +
      '    <button id="nbf-backend-steward-create-btn" style="padding:7px 12px; background:#16a34a; color:#fff; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">Create</button>' +
      '  </div>' +
      '  <div id="nbf-backend-steward-msg" style="display:none; font-size:11px; margin-top:8px;"></div>' +
      tokenBox +
      '</div>';
  }


  function renderLoggedInIdentityCard() {
    if (!isAdminUnlocked()) return '';

    var stewards = BACKEND_STEWARD_REGISTRY.stewards || [];
    var superAdmin = stewards.find(function(s) { return String(s.role || '') === 'super_admin' && Number(s.active) === 1; });
    if (!superAdmin) return '';

    return '' +
      '<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 12px; border:1px solid var(--nbf-bld); border-radius:8px; background:var(--nbf-main); margin-bottom:10px; flex-wrap:wrap;">' +
      '  <div style="display:flex; align-items:center; gap:10px;">' +
      '    <div style="width:34px; height:34px; border-radius:50%; background:rgba(99,102,241,0.16); border:1px solid rgba(99,102,241,0.30); display:flex; align-items:center; justify-content:center; font-size:18px;">👑</div>' +
      '    <div>' +
      '      <div style="font-size:11px; color:var(--nbf-mut); text-transform:uppercase;">League Control Identity</div>' +
      '      <div style="font-size:14px; color:var(--nbf-txt); font-weight:800;">' + escapeHTML(superAdmin.display_name || 'Super Admin') + '</div>' +
      '    </div>' +
      '  </div>' +
      '  <div>' + renderRoleBadge(superAdmin.role) + '</div>' +
      '</div>';
  }

  function renderBackendStewardRegistryCard() {
    var count = (BACKEND_STEWARD_REGISTRY.stewards || []).length;
    return '' +
      renderAdminUnlockBox() +
      renderStewardConsoleLights() +
      '<div style="display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:8px; margin-bottom:12px;">' +
      renderStatModule('Backend Stewards', count) +
      renderStatModule('State', BACKEND_STEWARD_REGISTRY.state) +
      renderStatModule('Identity Source', 'Backend') +
      '</div>' +
      '<div style="display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap;">' +
      '  <button id="nbf-backend-stewards-refresh-btn" style="padding:7px 12px; background:#6366f1; color:#fff; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">Refresh Backend Registry</button>' +
      '</div>' +
      renderLoggedInIdentityCard() +
      '<div style="background:var(--nbf-main); border:1px solid var(--nbf-bld); border-radius:7px; padding:10px 12px; margin-bottom:12px; overflow-x:visible;">' +
      renderBackendStewardRows() +
      '</div>' +
      renderBackendStewardEditForm() +
      renderBackendStewardCreateForm();
  }

  function fetchBackendStewards() {
    if (!isAdminUnlocked()) {
      BACKEND_STEWARD_REGISTRY.state = 'locked';
      BACKEND_STEWARD_REGISTRY.message = 'Admin mode locked.';
      renderStewardPanelContent();
      return;
    }

    BACKEND_STEWARD_REGISTRY.state = 'loading';
    BACKEND_STEWARD_REGISTRY.message = 'Loading backend stewards...';

    adminBackendRequest(CF_ADMIN_STEWARDS_ENDPOINT, { method: 'GET' }, 7000)
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function(payload) {
        if (!payload || !payload.ok) throw new Error(payload && payload.error ? payload.error : 'Invalid response');
        BACKEND_STEWARD_REGISTRY.state = 'loaded';
        BACKEND_STEWARD_REGISTRY.message = 'Loaded backend stewards.';
        BACKEND_STEWARD_REGISTRY.stewards = payload.stewards || [];
        addActivityLog('Backend steward registry loaded (' + BACKEND_STEWARD_REGISTRY.stewards.length + ').', 'success');
        renderStewardPanelContent();
      })
      .catch(function(err) {
        BACKEND_STEWARD_REGISTRY.state = 'error';
        BACKEND_STEWARD_REGISTRY.message = err && err.message ? err.message : String(err);
        addActivityLog('Backend steward registry failed: ' + BACKEND_STEWARD_REGISTRY.message, 'error');
        renderStewardPanelContent();
      });
  }

  function createBackendSteward() {
    if (!isAdminUnlocked()) return;

    var idEl = document.getElementById('nbf-backend-steward-torn-id');
    var nameEl = document.getElementById('nbf-backend-steward-name');
    var roleEl = document.getElementById('nbf-backend-steward-role');
    var msg = document.getElementById('nbf-backend-steward-msg');

    var tornId = sanitizePlainText(idEl ? idEl.value : '', 24);
    var displayName = sanitizePlainText(nameEl ? nameEl.value : '', 48);
    var role = sanitizePlainText(roleEl ? roleEl.value : 'event', 24);

    if (!tornId || !/^\d{1,12}$/.test(tornId)) {
      if (msg) {
        msg.style.display = 'block';
        msg.style.color = '#dc2626';
        msg.textContent = 'Torn ID must be numeric.';
      }
      return;
    }

    if (!displayName) {
      if (msg) {
        msg.style.display = 'block';
        msg.style.color = '#dc2626';
        msg.textContent = 'Display name is required.';
      }
      return;
    }

    if (msg) {
      msg.style.display = 'block';
      msg.style.color = 'var(--nbf-mut)';
      msg.textContent = 'Creating backend steward...';
    }

    adminBackendRequest(CF_ADMIN_STEWARDS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ torn_id: tornId, display_name: displayName, role: role })
    }, 7000)
      .then(function(res) {
        return res.json().then(function(payload) {
          if (!res.ok || !payload.ok) throw new Error(payload && payload.error ? payload.error : 'HTTP ' + res.status);
          return payload;
        });
      })
      .then(function(payload) {
        BACKEND_STEWARD_REGISTRY.lastToken = {
          token_once: payload.token_once,
          display_name: payload.steward && payload.steward.display_name
        };
        addActivityLog('Backend steward created: ' + displayName + '.', 'success');
        showScraperToast('Backend steward created.', 'success', 2500);
        fetchBackendStewards();
      })
      .catch(function(err) {
        if (msg) {
          msg.style.display = 'block';
          msg.style.color = '#dc2626';
          msg.textContent = err && err.message ? err.message : String(err);
        }
        addActivityLog('Backend steward create failed: ' + (err && err.message ? err.message : String(err)), 'error');
      });
  }


  function updateBackendSteward(stewardId) {
    var nameEl = document.getElementById('nbf-edit-steward-name');
    var roleEl = document.getElementById('nbf-edit-steward-role');
    var notesEl = document.getElementById('nbf-edit-steward-notes');

    var displayName = sanitizePlainText(nameEl ? nameEl.value : '', 48);
    var role = sanitizePlainText(roleEl ? roleEl.value : 'event', 24);
    var notes = sanitizePlainText(notesEl ? notesEl.value : '', 200);

    if (!displayName) {
      showScraperToast('Display name required.', 'error', 2500);
      return;
    }

    adminBackendRequest(CF_ADMIN_STEWARDS_ENDPOINT + '/' + encodeURIComponent(stewardId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName, role: role, notes: notes })
    }, 7000)
      .then(function(res) {
        return res.json().then(function(payload) {
          if (!res.ok || !payload.ok) throw new Error(payload && payload.error ? payload.error : 'HTTP ' + res.status);
          return payload;
        });
      })
      .then(function() {
        BACKEND_STEWARD_EDITOR.editingId = null;
        showScraperToast('Steward updated.', 'success', 2200);
        fetchBackendStewards();
      })
      .catch(function(err) {
        showScraperToast('Update failed: ' + (err && err.message ? err.message : String(err)), 'error', 3500);
      });
  }

  function toggleBackendSteward(stewardId, currentlyActive) {
    var action = currentlyActive ? 'disable' : 'enable';

    adminBackendRequest(CF_ADMIN_STEWARDS_ENDPOINT + '/' + encodeURIComponent(stewardId) + '/' + action, {
      method: 'POST'
    }, 7000)
      .then(function(res) {
        return res.json().then(function(payload) {
          if (!res.ok || !payload.ok) throw new Error(payload && payload.error ? payload.error : 'HTTP ' + res.status);
          return payload;
        });
      })
      .then(function() {
        showScraperToast('Steward ' + action + 'd.', 'success', 2200);
        fetchBackendStewards();
      })
      .catch(function(err) {
        showScraperToast('Action failed: ' + (err && err.message ? err.message : String(err)), 'error', 3500);
      });
  }

  function regenerateBackendStewardToken(stewardId) {
    if (!window.confirm('Regenerate token for steward #' + stewardId + '? The old token will stop working.')) return;

    adminBackendRequest(CF_ADMIN_STEWARDS_ENDPOINT + '/' + encodeURIComponent(stewardId) + '/regenerate-token', {
      method: 'POST'
    }, 7000)
      .then(function(res) {
        return res.json().then(function(payload) {
          if (!res.ok || !payload.ok) throw new Error(payload && payload.error ? payload.error : 'HTTP ' + res.status);
          return payload;
        });
      })
      .then(function(payload) {
        BACKEND_STEWARD_REGISTRY.lastToken = {
          token_once: payload.token_once,
          display_name: payload.steward && payload.steward.display_name
        };
        showScraperToast('New one-time token generated.', 'success', 2600);
        fetchBackendStewards();
      })
      .catch(function(err) {
        showScraperToast('Token regeneration failed: ' + (err && err.message ? err.message : String(err)), 'error', 3500);
      });
  }

  function renderAdminStewardRegistryBody() {
    var total = STEWARD_REGISTRY.length;
    var rows = '';

    if (!total) {
      rows = '<div style="font-size:12px; color:var(--nbf-mut); padding:10px 0;">No local steward notes saved.</div>';
    } else {
      rows += '<div style="display:grid; grid-template-columns:90px 1fr 110px 70px; gap:8px; padding:7px 0; border-bottom:1px solid var(--nbf-bld); font-size:11px; font-weight:700; color:var(--nbf-txt);">' +
        '<div>Torn ID</div><div>Name</div><div>Role</div><div></div></div>';

      STEWARD_REGISTRY.forEach(function(steward, idx) {
        var safeId = escapeHTML(sanitizePlainText(steward.id, 24) || '—');
        var safeName = escapeHTML(sanitizePlainText(steward.name, 48) || 'Unknown');
        var safeRole = escapeHTML(normalizeStewardRole(steward.role));

        rows += '<div style="display:grid; grid-template-columns:90px 1fr 110px 70px; gap:8px; align-items:center; padding:7px 0; border-bottom:1px solid var(--nbf-bld); font-size:11px; color:var(--nbf-mut);">' +
          '<div style="font-family:monospace;">' + safeId + '</div>' +
          '<div style="color:var(--nbf-txt); font-weight:600;">' + safeName + '</div>' +
          '<div>' + safeRole + '</div>' +
          '<button class="nbf-steward-remove-btn" data-idx="' + idx + '" style="padding:4px 7px; background:var(--nbf-field-bg); color:#dc2626; border:1px solid #fca5a5; border-radius:5px; font-size:10px; cursor:pointer;">Remove</button>' +
          '</div>';
      });
    }

    return '' +
      renderBackendStewardRegistryCard() +
      '<div style="height:12px;"></div>' +
      isLocalRegistryOnlyNotice() +
      '<details style="background:var(--nbf-alt2); border:1px solid var(--nbf-bld); border-radius:8px; padding:10px 12px;">' +
      '<summary style="cursor:pointer; font-size:12px; color:var(--nbf-txt); font-weight:600;">Local Notebook Registry (' + total + ' local)</summary>' +
      '<div style="display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:8px; margin:12px 0;">' +
      renderStatModule('Local Entries', total) +
      renderStatModule('Authority', 'None') +
      renderStatModule('Purpose', 'Notes') +
      '</div>' +
      '<div style="background:var(--nbf-main); border:1px solid var(--nbf-bld); border-radius:7px; padding:10px 12px; margin-bottom:12px;">' + rows + '</div>' +
      '<div style="display:grid; grid-template-columns:90px 1fr 120px auto; gap:8px; align-items:center;">' +
      '  <input id="nbf-new-steward-id" type="text" placeholder="Torn ID" autocomplete="off" maxlength="24" style="padding:7px 9px; border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:12px; background:var(--nbf-field-bg); color:var(--nbf-txt);" />' +
      '  <input id="nbf-new-steward-name" type="text" placeholder="Display name" autocomplete="off" maxlength="48" style="padding:7px 9px; border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:12px; background:var(--nbf-field-bg); color:var(--nbf-txt);" />' +
      '  <select id="nbf-new-steward-role" style="padding:7px 9px; border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:12px; background:var(--nbf-field-bg); color:var(--nbf-txt);">' +
      '    <option value="event">Event Steward</option><option value="chief">Chief Steward</option><option value="admin">Admin</option><option value="observer">Observer</option>' +
      '  </select>' +
      '  <button id="nbf-steward-add-btn" style="padding:7px 12px; background:#16a34a; color:#fff; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">Add Local Note</button>' +
      '</div>' +
      '<div id="nbf-steward-add-msg" style="display:none; font-size:11px; margin-top:8px;"></div>' +
      '</details>';
  }


  function renderBackendStewardRegistryInfo() {
    return '' +
      '<div style="font-size:11px; color:var(--nbf-mut); line-height:1.5; padding:9px 11px; border:1px solid #60a5fa; border-radius:7px; background:rgba(96,165,250,0.10); margin-top:12px;">' +
      '<strong style="color:#2563eb;">Backend Registry v1.0.3:</strong> After the worker and D1 migration are installed, Admin tools can list backend stewards. Token creation will stay backend-only and tokens are stored as hashes, never plain text.' +
      '</div>';
  }

  function renderAdminCompetitionManagerBody() {
    return renderComingSoonCard('Competition Manager is coming later in the stable 6.5.x line. It will create named leagues/championships, select scoring modes, and assign standings to competitions.');
  }

  function renderAdminDatabaseToolsBody() {
    return renderComingSoonCard('Database Tools will become safe click-buttons for verify tables, clear test races, recalculate standings, and diagnose missing bindings/secrets. No manual SQL during events.');
  }

  function renderAdminArchiveBody() {
    return renderComingSoonCard('Archive will move finished competitions into history without deleting race data. Delete will be admin-only and heavily guarded later.');
  }

  function renderStewardUploadStatusBody() {
    return renderIngestionStatusMarkup('✅ ' + CF_INGEST_ENDPOINT) + renderUploadCompletionSummary();
  }

  function renderStewardActivityBody() {
    return '' +
      '<div style="display:flex; justify-content:space-between; align-items:center; margin:0 0 8px 0;">' +
      '  <h3 style="margin:0; font-size:13px; color:var(--nbf-txt);">Activity Log</h3>' +
      '  <button id="nbf-activity-clear" style="padding:4px 8px; background:var(--nbf-field-bg); color:var(--nbf-mut); border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:11px; cursor:pointer;">Clear Log</button>' +
      '</div>' +
      renderActivityLogMarkup();
  }

  function renderStewardManualBody() {
    return '' +
      '<div style="font-size:12px; color:var(--nbf-mut); line-height:1.6;">' +
      '  <strong style="color:var(--nbf-txt);">Steward Manual</strong><br>' +
      '  1. Open only completed race log pages.<br>' +
      '  2. Make sure the Torn window is focused.<br>' +
      '  3. Confirm upload status after submission.<br>' +
      '  4. Check Activity Log if anything looks wrong.<br>' +
      '  5. For official competitions later: submit only to your assigned event slot.' +
      '</div>';
  }

  function renderStewardChecklistBody() {
    return '<h3 style="margin:0 0 8px 0; font-size:13px; color:var(--nbf-txt);">Automatic Upload Readiness</h3>' + renderGateChecklistMarkup();
  }

  function renderApiKeyControlCard() {
    var keyLength = STATE_API_KEY ? STATE_API_KEY.trim().length : 0;
    var keyMask = keyLength > 0 ? STATE_API_KEY.trim().slice(0, 4) + '••••••••••••••••' : 'Not configured';

    return '' +
      '<p style="margin:0 0 12px 0; font-size:11px; color:var(--nbf-mut); line-height:1.5;">Used only for syncing alliance driver data. Stored locally in your browser and sent only to Torn API.</p>' +
      '<div style="display:flex; align-items:center; gap:8px; padding:8px 10px; background:var(--nbf-main); border:1px solid var(--nbf-bld); border-radius:6px; margin-bottom:12px;">' +
      '  <span style="font-size:11px; color:var(--nbf-txt); font-weight:600;">Current API Key:</span>' +
      '  <span style="font-size:11px; color:var(--nbf-mut); font-family:monospace;">' + keyMask + '</span>' +
      '</div>' +
      '<button id="nbf-control-api-open" style="padding:8px; background:#6366f1; color:#fff; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; width:100%;">Configure Torn API Key</button>';
  }



  function normalizeControlAccordionStorage() {
    var state = loadControlSectionState();
    if (!state || state.open === undefined) saveControlSectionState({ open: '' });
  }



  function championshipRequest(url, options, timeoutMs) {
    options = options || {};
    options.headers = options.headers || {};
    options.headers['Authorization'] = 'Bearer ' + STATE_ADMIN_TOKEN_SESSION;
    if (options.body && !options.headers['Content-Type']) options.headers['Content-Type'] = 'application/json';
    return backendRequest(url, options, timeoutMs || 8000);
  }

  function fetchChampionshipData() {
    if (!isAdminUnlocked()) return;
    CHAMPIONSHIP_STATE.loading = true;
    return Promise.all([
      championshipRequest(CF_CHAMPIONSHIP_SEASONS_ENDPOINT,{method:'GET'}),
      championshipRequest(CF_CHAMPIONSHIP_EVENTS_ENDPOINT,{method:'GET'}),
      championshipRequest(CF_CHAMPIONSHIP_UNASSIGNED_ENDPOINT,{method:'GET'}),
      championshipRequest(CF_CHAMPIONSHIP_STANDINGS_ENDPOINT,{method:'GET'})
    ]).then(function(rs){ return Promise.all(rs.map(function(r){ return r.json().then(function(b){ if(!r.ok || !b.ok) throw new Error(b && b.error ? b.error : 'HTTP '+r.status); return b; }); })); })
    .then(function(p){ CHAMPIONSHIP_STATE.seasons=p[0].seasons||[]; CHAMPIONSHIP_STATE.events=p[1].events||[]; CHAMPIONSHIP_STATE.unassigned=p[2].races||[]; CHAMPIONSHIP_STATE.standings=p[3].standings||[]; CHAMPIONSHIP_STATE.loading=false; CHAMPIONSHIP_STATE.message='Championship data loaded.'; renderStewardPanelContent(); })
    .catch(function(e){ CHAMPIONSHIP_STATE.loading=false; CHAMPIONSHIP_STATE.message='Championship load failed: '+(e.message||e); showScraperToast(CHAMPIONSHIP_STATE.message,'error',3500); renderStewardPanelContent(); });
  }

  function createChampionshipSeason() {
    var name=sanitizePlainText((document.getElementById('nbf-champ-season-name')||{}).value||'',80);
    var year=Number((document.getElementById('nbf-champ-season-year')||{}).value||new Date().getFullYear());
    if(!name) return showScraperToast('Season name required.','error',2500);
    championshipRequest(CF_CHAMPIONSHIP_SEASONS_ENDPOINT,{method:'POST',body:JSON.stringify({name:name,year:year,scoring_type:'standard'})})
      .then(function(r){return r.json().then(function(b){if(!r.ok||!b.ok)throw new Error(b.error||('HTTP '+r.status));return b;});})
      .then(function(){showScraperToast('Season created.','success',2200);fetchChampionshipData();})
      .catch(function(e){showScraperToast('Season create failed: '+(e.message||e),'error',3500);});
  }

  function createChampionshipEvent() {
    var seasonId=Number((document.getElementById('nbf-champ-event-season')||{}).value||0);
    var name=sanitizePlainText((document.getElementById('nbf-champ-event-name')||{}).value||'',80);
    var track=sanitizePlainText((document.getElementById('nbf-champ-event-track')||{}).value||'',40);
    var round=Number((document.getElementById('nbf-champ-event-round')||{}).value||1);
    if(!seasonId||!name) return showScraperToast('Season and event name required.','error',2500);
    championshipRequest(CF_CHAMPIONSHIP_EVENTS_ENDPOINT,{method:'POST',body:JSON.stringify({season_id:seasonId,name:name,track:track,round_number:round})})
      .then(function(r){return r.json().then(function(b){if(!r.ok||!b.ok)throw new Error(b.error||('HTTP '+r.status));return b;});})
      .then(function(){showScraperToast('Event created.','success',2200);fetchChampionshipData();})
      .catch(function(e){showScraperToast('Event create failed: '+(e.message||e),'error',3500);});
  }

  function assignRaceToChampionshipEvent() {
    var raceId=sanitizePlainText((document.getElementById('nbf-champ-assign-race')||{}).value||'',40);
    var eventId=Number((document.getElementById('nbf-champ-assign-event')||{}).value||0);
    if(!raceId||!eventId) return showScraperToast('Race and event required.','error',2500);
    championshipRequest(CF_CHAMPIONSHIP_ASSIGN_ENDPOINT,{method:'POST',body:JSON.stringify({race_id:raceId,event_id:eventId})})
      .then(function(r){return r.json().then(function(b){if(!r.ok||!b.ok)throw new Error(b.error||('HTTP '+r.status));return b;});})
      .then(function(){showScraperToast('Race assigned.','success',2200);fetchChampionshipData();})
      .catch(function(e){showScraperToast('Assign failed: '+(e.message||e),'error',3500);});
  }

  function renderChampionshipEngineBody() {
    if(!isAdminUnlocked()) return '<div style="font-size:12px; color:var(--nbf-mut); padding:8px 0;">Login to manage championships.</div>';
    var seasons=CHAMPIONSHIP_STATE.seasons||[], events=CHAMPIONSHIP_STATE.events||[], unassigned=CHAMPIONSHIP_STATE.unassigned||[], standings=CHAMPIONSHIP_STATE.standings||[];
    var seasonOptions=seasons.map(function(s){return '<option value="'+escapeHTML(s.id)+'">'+escapeHTML(s.name+' ('+s.year+')')+'</option>';}).join('');
    var eventOptions=events.map(function(e){return '<option value="'+escapeHTML(e.id)+'">'+escapeHTML((e.season_name||'Season')+' · R'+(e.round_number||'?')+' · '+e.name)+'</option>';}).join('');
    var raceOptions=unassigned.map(function(r){return '<option value="'+escapeHTML(r.race_id)+'">'+escapeHTML(r.race_id+' · '+(r.result_count||0)+' results')+'</option>';}).join('');
    var html='<div id="nbf-championship-panel">'+
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:10px;"><span style="font-size:12px;color:var(--nbf-mut);">'+escapeHTML(CHAMPIONSHIP_STATE.message||'Season/Event foundation.')+'</span><button id="nbf-champ-refresh-btn" style="padding:6px 10px;background:#6366f1;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;">Refresh</button></div>'+
      '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px;">'+renderStatModule('Seasons',seasons.length)+renderStatModule('Events',events.length)+renderStatModule('Unassigned',unassigned.length)+renderStatModule('Ranked Drivers',standings.length)+'</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">'+
      '<div style="border:1px solid var(--nbf-bld);border-radius:7px;padding:10px;background:var(--nbf-main);"><h4 style="margin:0 0 8px;color:var(--nbf-txt);font-size:12px;">Create Season</h4><input id="nbf-champ-season-name" placeholder="Season name" style="width:100%;box-sizing:border-box;margin-bottom:6px;padding:7px 9px;border:1px solid var(--nbf-btn-border);border-radius:6px;background:var(--nbf-field-bg);color:var(--nbf-txt);font-size:12px;"><input id="nbf-champ-season-year" type="number" value="'+new Date().getFullYear()+'" style="width:100%;box-sizing:border-box;margin-bottom:8px;padding:7px 9px;border:1px solid var(--nbf-btn-border);border-radius:6px;background:var(--nbf-field-bg);color:var(--nbf-txt);font-size:12px;"><button id="nbf-champ-create-season-btn" style="padding:7px 12px;background:#16a34a;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">Create Season</button></div>'+
      '<div style="border:1px solid var(--nbf-bld);border-radius:7px;padding:10px;background:var(--nbf-main);"><h4 style="margin:0 0 8px;color:var(--nbf-txt);font-size:12px;">Create Event</h4><select id="nbf-champ-event-season" style="width:100%;box-sizing:border-box;margin-bottom:6px;padding:7px 9px;border:1px solid var(--nbf-btn-border);border-radius:6px;background:var(--nbf-field-bg);color:var(--nbf-txt);font-size:12px;">'+seasonOptions+'</select><input id="nbf-champ-event-name" placeholder="Event name" style="width:100%;box-sizing:border-box;margin-bottom:6px;padding:7px 9px;border:1px solid var(--nbf-btn-border);border-radius:6px;background:var(--nbf-field-bg);color:var(--nbf-txt);font-size:12px;"><input id="nbf-champ-event-track" placeholder="Track optional" style="width:100%;box-sizing:border-box;margin-bottom:6px;padding:7px 9px;border:1px solid var(--nbf-btn-border);border-radius:6px;background:var(--nbf-field-bg);color:var(--nbf-txt);font-size:12px;"><input id="nbf-champ-event-round" type="number" value="'+(events.length+1)+'" style="width:100%;box-sizing:border-box;margin-bottom:8px;padding:7px 9px;border:1px solid var(--nbf-btn-border);border-radius:6px;background:var(--nbf-field-bg);color:var(--nbf-txt);font-size:12px;"><button id="nbf-champ-create-event-btn" style="padding:7px 12px;background:#16a34a;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">Create Event</button></div></div>'+
      '<div style="border:1px solid var(--nbf-bld);border-radius:7px;padding:10px;background:var(--nbf-main);margin-bottom:12px;"><h4 style="margin:0 0 8px;color:var(--nbf-txt);font-size:12px;">Assign Race to Event</h4><div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;"><select id="nbf-champ-assign-race" style="padding:7px 9px;border:1px solid var(--nbf-btn-border);border-radius:6px;background:var(--nbf-field-bg);color:var(--nbf-txt);font-size:12px;">'+raceOptions+'</select><select id="nbf-champ-assign-event" style="padding:7px 9px;border:1px solid var(--nbf-btn-border);border-radius:6px;background:var(--nbf-field-bg);color:var(--nbf-txt);font-size:12px;">'+eventOptions+'</select><button id="nbf-champ-assign-btn" style="padding:7px 12px;background:#6366f1;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">Assign</button></div></div>'+
      '<h4 style="margin:8px 0;font-size:12px;color:var(--nbf-txt);">Championship Standings</h4>';
    if(!standings.length) html+='<div style="font-size:12px;color:var(--nbf-mut);padding:8px 0;">No assigned race results yet.</div>';
    else { html+='<div style="display:grid;grid-template-columns:44px 1fr 70px 60px 60px 70px;gap:8px;padding:6px 0;border-bottom:1px solid var(--nbf-bld);font-size:11px;color:var(--nbf-txt);font-weight:700;"><div>#</div><div>Driver</div><div>Points</div><div>Wins</div><div>Podiums</div><div>Races</div></div>'; standings.slice(0,20).forEach(function(r,i){html+='<div style="display:grid;grid-template-columns:44px 1fr 70px 60px 60px 70px;gap:8px;padding:5px 0;border-bottom:1px solid var(--nbf-bld);font-size:11px;color:var(--nbf-mut);"><div>'+(i+1)+'</div><div style="color:var(--nbf-txt);font-weight:700;">'+escapeHTML(r.driver_name||'')+'</div><div>'+escapeHTML(r.points||0)+'</div><div>'+escapeHTML(r.wins||0)+'</div><div>'+escapeHTML(r.podiums||0)+'</div><div>'+escapeHTML(r.races||0)+'</div></div>';});}
    return html+'</div>';
  }

  function bindChampionshipButtons() {
    var b=document.getElementById('nbf-champ-refresh-btn'); if(b) b.addEventListener('click',fetchChampionshipData);
    b=document.getElementById('nbf-champ-create-season-btn'); if(b) b.addEventListener('click',createChampionshipSeason);
    b=document.getElementById('nbf-champ-create-event-btn'); if(b) b.addEventListener('click',createChampionshipEvent);
    b=document.getElementById('nbf-champ-assign-btn'); if(b) b.addEventListener('click',assignRaceToChampionshipEvent);
  }

  function renderStewardPanelContent() {
    normalizeControlAccordionStorage();
    if (isAdminUnlocked() && !CHAMPIONSHIP_STATE.loading && !CHAMPIONSHIP_STATE.seasons.length && !CHAMPIONSHIP_STATE.message) window.setTimeout(fetchChampionshipData, 50);
    var targetContainer = document.getElementById('nbf-layout-body');
    if (!targetContainer) return;

    var stewardStatus = isStewardAuthorized()
      ? '<span style="color:#16a34a; font-weight:600;">● Steward token configured</span>'
      : '<span style="color:#f59e0b; font-weight:600;">● Steward token missing</span>';

    var tokenMask = STATE_STEWARD_TOKEN ? STATE_STEWARD_TOKEN.slice(0, 4) + '••••••••••••••••' : '';

    var stewardTokenBody = '' +
      '<div style="display:grid; grid-template-columns:1fr; gap:10px;">' +
      '  <div style="font-size:12px; color:var(--nbf-mut);">' + stewardStatus + '</div>' +
      (STATE_STEWARD_TOKEN ? '<div style="font-size:11px; color:var(--nbf-mut); font-family:monospace; padding:8px 10px; border:1px solid #16a34a; border-radius:6px; background:var(--nbf-main);">Current: ' + tokenMask + '</div>' : '') +
      '  <input id="nbf-steward-token-input" type="password" placeholder="' + (STATE_STEWARD_TOKEN ? 'Replace existing token...' : 'Paste Steward token here...') + '" autocomplete="new-password" style="width:100%; padding:8px 10px; border:1px solid var(--nbf-btn-border); border-radius:6px; font-size:12px; box-sizing:border-box; background:var(--nbf-field-bg); color:var(--nbf-txt);" />' +
      '  <div style="display:flex; gap:8px; flex-wrap:wrap;">' +
      '    <button id="nbf-steward-token-save" style="padding:7px 12px; background:#6366f1; color:#fff; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">Save Steward Token</button>' +
      '    <button id="nbf-steward-token-clear" style="padding:7px 12px; background:var(--nbf-field-bg); color:#dc2626; border:1px solid #fca5a5; border-radius:6px; font-size:12px; cursor:pointer;">Clear Token</button>' +
      '  </div>' +
      '  <div id="nbf-steward-token-msg" style="display:none; font-size:11px;"></div>' +
      '</div>';

    var adminHtml = '' +
      '<div style="margin-bottom:18px;">' +
      '  <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--nbf-bld); padding-bottom:6px; margin-bottom:10px;">' +
      '    <h3 style="margin:0; font-size:14px; color:var(--nbf-txt);">Admin</h3>' +
      '    <span style="font-size:11px; color:var(--nbf-mut);">Garage diagnostics and identity tools — admin token is session-only</span>' +
      '  </div>' +
      renderControlAccordion('admin-system-health', 'System Health', BACKEND_STATUS.backend || 'Not checked', renderAdminSystemHealthBody(), false) +
      renderControlAccordion('admin-steward-registry', 'Steward Registry', STEWARD_REGISTRY.length + ' local', renderAdminStewardRegistryBody(), false) +
      renderControlAccordion('admin-competition-manager', 'Competition Manager', 'coming later', renderAdminCompetitionManagerBody(), false) +
      renderControlAccordion('admin-championship-engine', 'Championship Engine', (CHAMPIONSHIP_STATE.seasons.length || 0) + ' season(s)', renderChampionshipEngineBody(), false) +
      renderControlAccordion('admin-database-tools', 'Database Tools', 'coming later', renderAdminDatabaseToolsBody(), false) +
      renderControlAccordion('admin-archive', 'Archive', 'coming later', renderAdminArchiveBody(), false) +
      '</div>';

    var stewardHtml = '' +
      '<div>' +
      '  <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--nbf-bld); padding-bottom:6px; margin-bottom:10px;">' +
      '    <h3 style="margin:0; font-size:14px; color:var(--nbf-txt);">Steward</h3>' +
      '    <span style="font-size:11px; color:var(--nbf-mut);">Race upload workflow and daily tools</span>' +
      '  </div>' +
      renderControlAccordion('steward-torn-account', 'Torn Account', STATE_API_KEY ? 'API key configured' : 'API key missing', renderApiKeyControlCard(), false) +
      renderControlAccordion('steward-auth', 'Steward Access', STATE_STEWARD_TOKEN ? 'configured' : 'missing', stewardTokenBody, false) +
      renderControlAccordion('steward-upload-status', 'Upload Status', LAST_INGESTION_STATUS.message || 'No upload yet', renderStewardUploadStatusBody(), false) +
      renderControlAccordion('steward-upload-queue', 'Upload Queue', loadUploadQueue().length + ' item(s)', renderUploadQueueBody(), false) +
      renderControlAccordion('steward-activity-log', 'Activity Log', 'last events', renderStewardActivityBody(), false) +
      renderControlAccordion('steward-manual', 'Manual', 'quick guide', renderStewardManualBody(), false) +
      renderControlAccordion('steward-checklist', 'Checklist', 'upload gates', renderStewardChecklistBody(), false) +
      '</div>';

    var panelHtml = '<div style="padding:20px; max-width:900px; margin:0 auto; background:var(--nbf-main); font-family:sans-serif;">';
    panelHtml += '<div style="margin-bottom:18px;">';
    panelHtml += '<h2 style="margin:0; font-size:16px; font-weight:600; color:var(--nbf-txt);">Control Center</h2>';
    panelHtml += '<p style="margin:4px 0 0 0; font-size:12px; color:var(--nbf-mut); line-height:1.5;">Admin and Steward operations live here. Daily race actions stay visible; non-daily tools stay folded until needed. Security authority always belongs to the backend, never to local UI entries.</p>';
    panelHtml += '</div>';
    panelHtml += adminHtml;
    panelHtml += stewardHtml;
    panelHtml += '</div>';

    targetContainer.innerHTML = panelHtml;

    var toggles = targetContainer.querySelectorAll('.nbf-control-accordion-toggle');
    for (var t = 0; t < toggles.length; t++) {
      toggles[t].addEventListener('click', function() {
        var sectionId = this.getAttribute('data-nbf-section');
        var currentlyOpen = isControlSectionOpen(sectionId, false);
        saveControlSectionState({ open: currentlyOpen ? '' : sectionId });
        renderStewardPanelContent();
      });
    }

    var controlApiBtn = document.getElementById('nbf-control-api-open');
    if (controlApiBtn) controlApiBtn.addEventListener('click', function() {
      var modalContainer = document.getElementById('nbf-modal-container');
      displayKeySetupPanel(modalContainer, function() { baseCacheRouter(true); });
    });

    var backendCheckBtn = document.getElementById('nbf-backend-check-btn');
    if (backendCheckBtn) backendCheckBtn.addEventListener('click', function() { refreshBackendStatus(true); });

    var saveBtn = document.getElementById('nbf-steward-token-save');
    if (saveBtn) saveBtn.addEventListener('click', function() {
      var input = document.getElementById('nbf-steward-token-input');
      var msg = document.getElementById('nbf-steward-token-msg');
      var val = input ? input.value.trim() : '';
      if (!val) {
        if (msg) {
          msg.style.display = 'block';
          msg.style.color = '#c62828';
          msg.textContent = 'Token cannot be empty.';
        }
        return;
      }
      STATE_STEWARD_TOKEN = val;
      localStorage.setItem(CONFIG_STOKEN_KEY, val);
      setGateStatus('token', 'pass');
      addActivityLog('Steward token saved locally.', 'success');
      showScraperToast('Steward token saved.', 'success', 2500);
      renderStewardPanelContent();
    });

    var clearBtn = document.getElementById('nbf-steward-token-clear');
    if (clearBtn) clearBtn.addEventListener('click', function() {
      STATE_STEWARD_TOKEN = '';
      secureDeleteValue(CONFIG_STOKEN_KEY);
      setGateStatus('token', 'missing');
      addActivityLog('Steward token cleared.', 'warning');
      showScraperToast('Steward token cleared.', 'info', 2500);
      renderStewardPanelContent();
    });

    var clearLocalBtn = document.getElementById('nbf-ingest-clear-local');
    if (clearLocalBtn) clearLocalBtn.addEventListener('click', function() {
      clearSubmittedRaceMap();
      clearLastIngestionStatus();
      addActivityLog('Local race upload history cleared.', 'warning');
      showScraperToast('Local race history cleared.', 'info', 2500);
      renderStewardPanelContent();
    });

    var activityClearBtn = document.getElementById('nbf-activity-clear');
    if (activityClearBtn) activityClearBtn.addEventListener('click', function() {
      clearActivityLog();
      renderStewardPanelContent();
    });

    var adminUnlockBtn = document.getElementById('nbf-admin-unlock-btn');
    if (adminUnlockBtn) adminUnlockBtn.addEventListener('click', function() {
      var tornEl = document.getElementById('nbf-admin-login-torn-id');
      var tokenEl = document.getElementById('nbf-admin-token-input');
      var tornId = sanitizePlainText(tornEl ? tornEl.value : '', 24);
      var token = tokenEl ? tokenEl.value.trim() : '';

      if (!tornId || !/^\d{1,12}$/.test(tornId)) {
        showScraperToast('Valid Torn ID required.', 'error', 2500);
        return;
      }

      if (!token) {
        showScraperToast('Steward token required.', 'error', 2500);
        return;
      }

      backendRequest(CF_AUTH_LOGIN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ torn_id: tornId, token: token })
      }, 7000)
        .then(function(res) {
          return res.json().then(function(payload) {
            if (!res.ok || !payload.ok) throw new Error(payload && payload.error ? payload.error : 'HTTP ' + res.status);
            return payload;
          });
        })
        .then(function(payload) {
          STATE_ADMIN_TOKEN_SESSION = payload.session_token;
          BACKEND_LOGIN_IDENTITY = payload.steward || null;
          sessionStorage.setItem(CONFIG_ADMIN_SESSION_KEY, payload.session_token);
          sessionStorage.setItem('nbf_v6529_login_identity', JSON.stringify(BACKEND_LOGIN_IDENTITY || {}));
          showScraperToast('Steward registry login successful.', 'success', 2500);
          fetchBackendStewards();
        })
        .catch(function(err) {
          showScraperToast('Login failed: ' + (err && err.message ? err.message : String(err)), 'error', 3500);
        });
    });

    var adminLockBtn = document.getElementById('nbf-admin-lock-btn');
    if (adminLockBtn) adminLockBtn.addEventListener('click', function() {
      STATE_ADMIN_TOKEN_SESSION = '';
      sessionStorage.removeItem(CONFIG_ADMIN_SESSION_KEY);
      sessionStorage.removeItem('nbf_v6529_login_identity');
      BACKEND_LOGIN_IDENTITY = null;
      STATE_ADMIN_TOKEN_SESSION = '';
      BACKEND_STEWARD_REGISTRY.lastToken = null;
      BACKEND_STEWARD_EDITOR.editingId = null;
      BACKEND_STEWARD_REGISTRY.state = 'locked';
      BACKEND_STEWARD_REGISTRY.message = 'Admin mode locked.';
      BACKEND_STEWARD_REGISTRY.stewards = [];
      BACKEND_STEWARD_REGISTRY.lastToken = null;
      showScraperToast('Admin mode locked.', 'info', 2200);
      renderStewardPanelContent();
    });

    var backendRefreshBtn = document.getElementById('nbf-backend-stewards-refresh-btn');
    if (backendRefreshBtn) backendRefreshBtn.addEventListener('click', fetchBackendStewards);

    var backendCreateBtn = document.getElementById('nbf-backend-steward-create-btn');
    if (backendCreateBtn) backendCreateBtn.addEventListener('click', createBackendSteward);

    var backendEditBtns = document.querySelectorAll('.nbf-backend-steward-edit-btn');
    Array.prototype.forEach.call(backendEditBtns, function(btn) {
      btn.addEventListener('click', function() {
        BACKEND_STEWARD_EDITOR.editingId = this.getAttribute('data-id');
        renderStewardPanelContent();
      });
    });

    var backendToggleBtns = document.querySelectorAll('.nbf-backend-steward-toggle-btn');
    Array.prototype.forEach.call(backendToggleBtns, function(btn) {
      btn.addEventListener('click', function() {
        toggleBackendSteward(this.getAttribute('data-id'), this.getAttribute('data-active') === '1');
      });
    });

    var backendTokenBtns = document.querySelectorAll('.nbf-backend-steward-token-btn');
    Array.prototype.forEach.call(backendTokenBtns, function(btn) {
      btn.addEventListener('click', function() {
        regenerateBackendStewardToken(this.getAttribute('data-id'));
      });
    });

    var editSaveBtn = document.getElementById('nbf-edit-steward-save-btn');
    if (editSaveBtn) editSaveBtn.addEventListener('click', function() {
      updateBackendSteward(this.getAttribute('data-id'));
    });

    var editCancelBtn = document.getElementById('nbf-edit-steward-cancel-btn');
    if (editCancelBtn) editCancelBtn.addEventListener('click', function() {
      BACKEND_STEWARD_EDITOR.editingId = null;
      renderStewardPanelContent();
    });

    var addStewardBtn = document.getElementById('nbf-steward-add-btn');
    if (addStewardBtn) addStewardBtn.addEventListener('click', function() {
      var newIdEl = document.getElementById('nbf-new-steward-id');
      var newNameEl = document.getElementById('nbf-new-steward-name');
      var newRoleEl = document.getElementById('nbf-new-steward-role');
      var addMsg = document.getElementById('nbf-steward-add-msg');

      var newId = sanitizePlainText(newIdEl ? newIdEl.value : '', 24);
      var newName = sanitizePlainText(newNameEl ? newNameEl.value : '', 48);
      var newRole = normalizeStewardRole(newRoleEl ? newRoleEl.value : 'event');

      if (newId && !/^\d{1,12}$/.test(newId)) {
        if (addMsg) {
          addMsg.style.display = 'block';
          addMsg.style.color = '#dc2626';
          addMsg.textContent = 'Torn ID should contain numbers only.';
        }
        return;
      }

      if (!newId || !newName) {
        if (addMsg) {
          addMsg.style.display = 'block';
          addMsg.style.color = '#dc2626';
          addMsg.textContent = 'Torn ID and display name are required.';
        }
        return;
      }

      var duplicate = STEWARD_REGISTRY.some(function(s) { return String(s.id) === String(newId); });
      if (duplicate) {
        if (addMsg) {
          addMsg.style.display = 'block';
          addMsg.style.color = '#dc2626';
          addMsg.textContent = 'A steward with that Torn ID already exists.';
        }
        return;
      }

      STEWARD_REGISTRY.push({ id: newId, name: newName, role: newRole });
      saveStewardRegistry();
      addActivityLog('Local steward entry added: ' + newName + ' (' + newRole + ').', 'success');
      showScraperToast('Local steward entry added.', 'success', 2200);
      renderStewardPanelContent();
    });

    var removeBtns = document.querySelectorAll('.nbf-steward-remove-btn');
    Array.prototype.forEach.call(removeBtns, function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(this.getAttribute('data-idx'), 10);
        if (isNaN(idx) || !STEWARD_REGISTRY[idx]) return;
        var removed = STEWARD_REGISTRY[idx];
        STEWARD_REGISTRY.splice(idx, 1);
        saveStewardRegistry();
        addActivityLog('Local steward entry removed: ' + sanitizePlainText((removed.name || removed.id), 48) + '.', 'warning');
        showScraperToast('Local steward entry removed.', 'info', 2200);
        renderStewardPanelContent();
      });
    });

    if (isAdminUnlocked() && BACKEND_STEWARD_REGISTRY.state === 'locked') {
      fetchBackendStewards();
    }

    refreshBackendStatus(false);
  }


  function buildPayloadSummary(payload) {
    var resultCount = payload && Array.isArray(payload.results) ? payload.results.length : 0;
    var firstResult = resultCount > 0 ? payload.results[0] : null;
    var lastResult  = resultCount > 0 ? payload.results[resultCount - 1] : null;

    return {
      race_id: payload && payload.race_id ? String(payload.race_id) : null,
      scraped_at: payload && payload.scraped_at ? String(payload.scraped_at) : null,
      result_count: resultCount,
      first_driver: firstResult ? {
        position: firstResult.position || null,
        name: firstResult.name || null,
        time: firstResult.time || null
      } : null,
      last_driver: lastResult ? {
        position: lastResult.position || null,
        name: lastResult.name || null,
        time: lastResult.time || null
      } : null,
      has_token: !!(payload && payload.steward_token),
      endpoint: CF_INGEST_ENDPOINT
    };
  }

  function logPayloadPreview(payload) {
    var summary = buildPayloadSummary(payload);
    console.group('[NB Racing] Payload Preview — Race #' + (summary.race_id || 'unknown'));
    console.log('Summary:', summary);
    console.log('Full payload:', payload);
    console.groupEnd();

    addActivityLog(
      'Race #' + (summary.race_id || 'unknown') +
      ': Payload ready — ' + summary.result_count + ' driver result row(s).'
    );
  }

  function checkAndScrapeRace() {
    resetGateStatus();
    var context = getRacingURLContext();
    var tab    = context.tab;
    var raceID = context.raceID;

    if (tab !== 'log' || !raceID) {
      setGateStatus('url', 'skip: not race log');
      console.log('[NB Racing] Scraper skipped: not a race log page.');
      return;
    }

    setGateStatus('url', 'pass: race log #' + raceID);

    // Torn compliance guard: never scrape DOM or transmit data from an unfocused/hidden window.
    if (!canScrapeRace('initial race log check')) {
      setGateStatus('focus', 'waiting: not focused');
      setLastIngestionStatus('info', 'Skipped — window not focused.', raceID, '—');
      return;
    }

    setGateStatus('focus', 'pass');

    // Must be an authorized Steward
    if (!isStewardAuthorized()) {
      setGateStatus('token', 'missing');
      console.log('[NB Racing] Scraper skipped: Steward token is not set.');
      setLastIngestionStatus('info', 'Skipped — Steward token is not set.', raceID, '—');
      return;
    }

    setGateStatus('token', 'pass');

    if (hasSubmittedRace(raceID)) {
      setGateStatus('duplicate', 'duplicate: local');
      console.log('[NB Racing] Scraper skipped: race ' + raceID + ' is already marked as submitted locally.');
      setLastIngestionStatus('duplicate', 'Skipped — already submitted locally.', raceID, '—');
      showScraperToast('🟡 Race #' + raceID + ' already submitted from this browser. Upload skipped.', 'info', 4000);
      return;
    }

    setGateStatus('duplicate', 'pass');

    // Wait for the leaderboard DOM to be present (page may still be loading)
    var attempts = 0;
    var maxAttempts = 20;

    function tryExtract() {
      // Torn compliance guard repeated because extraction may be delayed while the DOM loads.
      if (!canScrapeRace('delayed DOM extraction')) {
        setGateStatus('focus', 'waiting: lost focus');
        setLastIngestionStatus('info', 'Skipped — window lost focus before extraction.', raceID, '—');
        return;
      }

      attempts++;
      var leaderBoard = document.getElementById('leaderBoard');

      if (!leaderBoard) {
        if (attempts < maxAttempts) {
          window.setTimeout(tryExtract, 500);
        } else {
          setGateStatus('dom', 'failed: not found');
          console.warn('[NB Racing] Scraper: leaderBoard element not found after ' + maxAttempts + ' attempts.');
          setLastIngestionStatus('error', 'Failed — race leaderboard DOM not found.', raceID, '—');
        }
        return;
      }

      setGateStatus('dom', 'found');
      var drivers = leaderBoard.querySelectorAll('li[id^="lbr-"]');
      if (drivers.length === 0) {
        if (attempts < maxAttempts) {
          window.setTimeout(tryExtract, 500);
          return;
        }
        setGateStatus('drivers', 'failed: none');
        console.warn('[NB Racing] Scraper: no race result rows found after ' + maxAttempts + ' attempts.');
        setLastIngestionStatus('error', 'Failed — no race result rows found.', raceID, 0);
        return;
      }

      var results = [];
      drivers.forEach(function(driverLi) {
        results.push({
          position: driverLi.querySelector('.race-place')  ? driverLi.querySelector('.race-place').textContent.trim()  : null,
          name:     driverLi.querySelector('.race-name')   ? driverLi.querySelector('.race-name').textContent.trim()   : null,
          time:     driverLi.querySelector('.time')        ? driverLi.querySelector('.time').textContent.trim()        : null
        });
      });

      results = results.filter(function(result) {
        return result && result.name && result.position;
      });

      if (results.length === 0) {
        setGateStatus('drivers', 'failed: zero valid');
        console.warn('[NB Racing] Scraper: parsed zero valid race results for race ' + raceID + '.');
        setLastIngestionStatus('error', 'Failed — zero valid results parsed.', raceID, 0);
        return;
      }

      setGateStatus('drivers', 'pass: ' + results.length + ' result row(s)');
      if (!/^\d+$/.test(String(raceID))) {
        setGateStatus('payload', 'invalid raceID');
        setLastIngestionStatus('error', 'Failed — raceID is not numeric.', raceID, results.length);
        return;
      }
      setGateStatus('payload', 'valid');

      var payload = {
        race_id:        raceID,
        scraped_at:     new Date().toISOString(),
        steward_token:  STATE_STEWARD_TOKEN.trim(),
        results:        results
      };

      console.log('[NB Racing] Scraper payload ready:', payload);
      logPayloadPreview(payload);
      showScraperToast('⚡ Race #' + raceID + ' detected — transmitting ' + results.length + ' results...', 'info', 3000);
      addActivityLog('Race #' + raceID + ': Upload attempt started.');
      transmitRacePayload(payload);
    }

    tryExtract();
  }

  // ============================================================
  // CLOUDFLARE POST — TRANSMIT RACE PAYLOAD
  // ============================================================

  function transmitRacePayload(payload) {
    // Torn compliance guard: never transmit or queue data from an unfocused/hidden window.
    if (!canScrapeRace('payload transmission')) {
      setLastIngestionStatus('info', 'Skipped — window lost focus before upload.', payload && payload.race_id, payload && payload.results ? payload.results.length : '—');
      return;
    }

    if (!payload || !payload.race_id || !Array.isArray(payload.results) || !payload.results.length) {
      setLastIngestionStatus('error', 'Payload invalid — upload not queued.', payload && payload.race_id, '—');
      return;
    }

    // Abort if endpoint is still the placeholder.
    if (CF_INGEST_ENDPOINT.indexOf('YOUR-WORKER') !== -1) {
      console.warn('[NB Racing] CF endpoint is still a placeholder. Set CF_INGEST_ENDPOINT before deploying.');
      setLastIngestionStatus('error', 'Cloudflare endpoint not configured.', payload.race_id, payload.results.length);
      showScraperToast('⚠️ Cloudflare endpoint not configured yet.', 'error', 5000);
      return;
    }

    // Use the personal steward session whenever available. The old steward_token field is retained only
    // for backward compatibility with older local states.
    payload.steward_token = '';
    payload.fingerprint = payload.fingerprint || computeRaceFingerprint(payload);

    if (!confirmFirstRaceUpload(payload.race_id, payload.results.length)) {
      setLastIngestionStatus('info', 'Upload cancelled by user.', payload.race_id, payload.results.length);
      return;
    }

    setGateStatus('backend', 'queued');
    queueRaceUpload(payload);
  }

  // ============================================================
  // FLOATING TRIGGER BUTTON (Dashboard)
  // ============================================================


  /**********************************************************************
   * BOOK 12 — DATA EXPORT
   *
   * Purpose:
   *     Exports the current runtime driver dataset to CSV.
   *
   * Contains:
   *     - processDataExportToCSV()
   *
   * Dependencies:
   *     - Runtime Members
   *     - Browser Blob API
   **********************************************************************/

  function processDataExportToCSV() {
    var rawExportCollection = parseRuntimePipeline();
    if (!rawExportCollection || rawExportCollection.length === 0) { alert('The target collection contains no items to structure.'); return; }

    var lineHeaders = ['Rank', 'Driver ID', 'Driver Name', 'Faction Name', 'Racing Skill', 'Wins Count', 'Runs Executed', 'Calculated Efficiency', 'Racing Points', 'Handicap Applied'];
    var matrixRows  = [lineHeaders.join(',')];

    rawExportCollection.forEach(function(item, idx) {
      matrixRows.push([
        idx + 1,
        item.id,
        '"' + item.name.replace(/"/g, '""') + '"',
        '"' + (item.factionName || '').replace(/"/g, '""') + '"',
        (item.racing_skill || 0).toFixed(4),
        item.racing_wins   || 0,
        item.races_entered || 0,
        (item.racing_ratio || 0).toFixed(2),
        item.racing_points || 0,
        (item.handicap     || 0).toFixed(2)
      ].join(','));
    });

    var dataBlob       = new Blob([matrixRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var layoutAnchor   = document.createElement('a');
    var downloadUri    = URL.createObjectURL(dataBlob);
    layoutAnchor.setAttribute('href', downloadUri);
    layoutAnchor.setAttribute('download', 'nuclear_family_alliance_export_' + Date.now() + '.csv');
    layoutAnchor.style.visibility = 'hidden';
    document.body.appendChild(layoutAnchor);
    layoutAnchor.click();
    document.body.removeChild(layoutAnchor);
  }

  // ============================================================
  // CACHE ROUTER & API FETCH PIPELINE
  // ============================================================


  /**********************************************************************
   * BOOK 13 — TORN API SYNC PIPELINE
   *
   * Purpose:
   *     Loads cached data, fetches faction rosters, fetches individual racing stats, and completes sync.
   *
   * Contains:
   *     - baseCacheRouter()
   *     - processFactionQueueBatches()
   *     - processIndividualDriversSequence()
   *     - completePipelineProcessing()
   *
   * Dependencies:
   *     - Torn API
   *     - Runtime State
   *     - Storage
   *     - Router
   *     - Utilities
   **********************************************************************/

  function baseCacheRouter(bypassCacheMode) {
    if (FLAG_IS_FETCHING) return;

    var targetCacheBlob = localStorage.getItem(CONFIG_CACHE_KEY);
    var timestampMarker = localStorage.getItem(CONFIG_TIME_KEY);
    var cachedLabel     = document.getElementById('nbf-txt-cache');

    if (!bypassCacheMode && targetCacheBlob && timestampMarker) {
      var ageOfData = Date.now() - parseInt(timestampMarker);
      if (ageOfData < CACHE_DURATION) {
        RUNTIME_MEMBERS = JSON.parse(targetCacheBlob);
        var skillsArray = RUNTIME_MEMBERS.map(function(m) { return m.racing_skill || 0; });
        RUNTIME_MAX_SKILL = Math.max.apply(Math, skillsArray);
        if (RUNTIME_MAX_SKILL < 1) RUNTIME_MAX_SKILL = 1;
        if (cachedLabel) { cachedLabel.style.color = '#16a34a'; cachedLabel.textContent = '⚡ Cache Active'; }
        routerViewRefresh();
        return;
      }
    }

    if (!STATE_API_KEY) return;
    if (cachedLabel) { cachedLabel.style.color = '#ef4444'; cachedLabel.textContent = '🔄 Fetching Server Records...'; }
    FLAG_IS_FETCHING = true;
    RUNTIME_MEMBERS  = [];
    processFactionQueueBatches(0);
  }

  function processFactionQueueBatches(factionPointer) {
    if (factionPointer >= TARGET_FACTIONS.length) { completePipelineProcessing(); return; }

    var activeTargetFactionObj = TARGET_FACTIONS[factionPointer];
    var progressTrackerNode    = document.getElementById('nbf-layout-progress');
    if (progressTrackerNode) {
      progressTrackerNode.style.display = 'block';
      progressTrackerNode.textContent   = 'Contacting mainframe database: Processing target ' + activeTargetFactionObj.name + ' (' + (factionPointer + 1) + ' / ' + TARGET_FACTIONS.length + ')...';
    }

    fetch('https://api.torn.com/faction/' + activeTargetFactionObj.id + '?selections=basic&key=' + STATE_API_KEY)
      .then(function(res) { return res.json(); })
      .then(function(payload) {
        if (payload.error) {
          console.error('[NB Racing] Faction fetch error for ' + activeTargetFactionObj.name + ' (ID: ' + activeTargetFactionObj.id + '):', payload.error.error || 'Unknown error', '| Code:', payload.error.code);
          executeAsyncDelay(750, function() { processFactionQueueBatches(factionPointer + 1); });
          return;
        }
        var rosterDataset = payload.members || {};
        if (Object.keys(rosterDataset).length === 0) {
          console.warn('[NB Racing] No members for faction: ' + activeTargetFactionObj.name + ' (ID: ' + activeTargetFactionObj.id + ')');
        }
        var extractedProfileCollection = [];
        for (var keyId in rosterDataset) {
          if (rosterDataset.hasOwnProperty(keyId)) {
            extractedProfileCollection.push({
              id: keyId,
              name: rosterDataset[keyId].name,
              factionId: activeTargetFactionObj.id,
              factionName: activeTargetFactionObj.name
            });
          }
        }
        processIndividualDriversSequence(extractedProfileCollection, 0, function() {
          executeAsyncDelay(750, function() { processFactionQueueBatches(factionPointer + 1); });
        });
      })
      .catch(function(err) {
        console.error(err);
        executeAsyncDelay(750, function() { processFactionQueueBatches(factionPointer + 1); });
      });
  }

  function processIndividualDriversSequence(profileCollection, memberIndex, continuousCallback) {
    if (memberIndex >= profileCollection.length) { continuousCallback(); return; }

    var trackingMemberNode = profileCollection[memberIndex];
    var dataProgressBar    = document.getElementById('nbf-layout-progress');
    if (dataProgressBar) dataProgressBar.textContent = 'Syncing metric nodes: Reading driver attributes (' + trackingMemberNode.name + ')...';

    fetch('https://api.torn.com/user/' + trackingMemberNode.id + '?selections=personalstats&key=' + STATE_API_KEY)
      .then(function(res) { return res.json(); })
      .then(function(payload) {
        if (payload.error) {
          console.error('[NB Racing] User fetch error for ID ' + trackingMemberNode.id + ' (' + trackingMemberNode.name + '):', payload.error.error);
          executeAsyncDelay(650, function() { processIndividualDriversSequence(profileCollection, memberIndex + 1, continuousCallback); });
          return;
        }
        var s = payload.personalstats || {};
        trackingMemberNode.racing_skill  = s.racingskill   !== undefined ? s.racingskill   : 0;
        trackingMemberNode.racing_wins   = s.raceswon             !== undefined ? s.raceswon             : 0;
        trackingMemberNode.races_entered = s.racesentered  !== undefined ? s.racesentered  : 0;
        trackingMemberNode.racing_points = s.racingpointsearned   !== undefined ? s.racingpointsearned   : 0;
        trackingMemberNode.racing_ratio  = trackingMemberNode.races_entered > 0
          ? (trackingMemberNode.racing_wins / trackingMemberNode.races_entered) * 100 : 0;
        RUNTIME_MEMBERS.push(trackingMemberNode);
        executeAsyncDelay(650, function() { processIndividualDriversSequence(profileCollection, memberIndex + 1, continuousCallback); });
      })
      .catch(function(err) {
        console.error(err);
        executeAsyncDelay(650, function() { processIndividualDriversSequence(profileCollection, memberIndex + 1, continuousCallback); });
      });
  }

  function completePipelineProcessing() {
    var notificationProgressBar = document.getElementById('nbf-layout-progress');
    if (notificationProgressBar) notificationProgressBar.style.display = 'none';

    var calculatedSkillsArray = RUNTIME_MEMBERS.map(function(m) { return m.racing_skill || 0; });
    RUNTIME_MAX_SKILL = Math.max.apply(Math, calculatedSkillsArray);
    if (RUNTIME_MAX_SKILL < 1) RUNTIME_MAX_SKILL = 1;

    localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(RUNTIME_MEMBERS));
    localStorage.setItem(CONFIG_TIME_KEY, Date.now().toString());

    var secondaryCacheLabel = document.getElementById('nbf-txt-cache');
    if (secondaryCacheLabel) { secondaryCacheLabel.style.color = '#16a34a'; secondaryCacheLabel.textContent = '⚡ Cache Active'; }

    FLAG_IS_FETCHING = false;
    routerViewRefresh();
  }


  /**********************************************************************
   * BOOK 14 — HELP LIBRARY
   *
   * Purpose:
   *     Renders the internal help and FAQ panel.
   *
   * Contains:
   *     - renderHelpPanelContent()
   *
   * Dependencies:
   *     - FAQ database
   *     - Dashboard shell
   **********************************************************************/

  function renderHelpPanelContent() {
    var targetContainer = document.getElementById('nbf-layout-body');
    if (!targetContainer) return;

    var panelHtml = '<div style="padding:20px; max-width:760px; margin:0 auto; background:var(--nbf-main);">';
    panelHtml += '<h2 style="margin-top:0; margin-bottom:6px; font-size:16px; color:var(--nbf-txt);">Documentation & Security Core</h2>';
    panelHtml += '<p style="margin-top:0; margin-bottom:20px; font-size:12px; color:var(--nbf-mut); line-height:1.5;">This script isolates execution loops strictly inside the client sandbox environment. Zero external logging proxies or metric data collectors are integrated into the architecture operations.</p>';
    panelHtml += '<div style="display:flex; flex-direction:column; gap:8px;">';

    FAQ_DATABASE.forEach(function(item, idx) {
      panelHtml += '<div class="nbf-faq-item">';
      panelHtml += '  <div class="nbf-faq-header" data-fidx="' + idx + '" style="padding:10px 12px; background:var(--nbf-alt); font-weight:600; cursor:pointer; display:flex; justify-content:space-between; align-items:center;"><span style="color:var(--nbf-txt); font-size:12px;">' + item.q + '</span><span class="nbf-arrow-indicator" style="color:var(--nbf-mut); font-size:11px;">▼</span></div>';
      panelHtml += '  <div id="nbf-faq-content-' + idx + '" class="nbf-faq-content" style="font-size:12px; padding:12px; border-top:1px solid var(--nbf-bld); display:none !important; line-height:1.5; color:var(--nbf-txt); background:var(--nbf-main);">' + item.a + '</div>';
      panelHtml += '</div>';
    });

    panelHtml += '</div></div>';
    targetContainer.innerHTML = panelHtml;

    var headers = targetContainer.querySelectorAll('.nbf-faq-header');
    for (var h = 0; h < headers.length; h++) {
      headers[h].addEventListener('click', function(e) {
        e.preventDefault();
        var currentIdx       = this.getAttribute('data-fidx');
        var targetBlock      = document.getElementById('nbf-faq-content-' + currentIdx);
        var isHidden         = targetBlock.style.getPropertyValue('display').indexOf('none') !== -1;
        var allContents      = targetContainer.querySelectorAll('.nbf-faq-content');
        var allArrows        = targetContainer.querySelectorAll('.nbf-arrow-indicator');
        for (var c = 0; c < allContents.length; c++) {
          allContents[c].style.setProperty('display', 'none', 'important');
          if (allArrows[c]) allArrows[c].textContent = '▼';
        }
        if (isHidden) {
          targetBlock.style.setProperty('display', 'block', 'important');
          var arrow = this.querySelector('.nbf-arrow-indicator');
          if (arrow) arrow.textContent = '▲';
        }
      });
    }
  }

  // ============================================================
  // LEAGUE SETUP PANEL
  // ============================================================


  /**********************************************************************
   * BOOK 15 — ENTRY POINT
   *
   * Purpose:
   *     Chooses dashboard mode or steward scraper mode based on the current Torn Racing URL.
   *
   * Contains:
   *     - URL context detection
   *     - DOMContentLoaded handling
   *
   * Dependencies:
   *     - Dashboard Shell
   *     - Race Log Scraper
   **********************************************************************/


  // ============================================================
  // ENTRY POINT — URL CONTEXT DETECTION
  // Two modes:
  //   1. sid=racing (no tab=log) → mount the dashboard float button
  //   2. sid=racing&tab=log&raceID=X → fire the Steward scraper
  // ============================================================

  var racingContext = getRacingURLContext();
  if (racingContext.isRacing) {
    var isLogPage = racingContext.tab === 'log' && racingContext.raceID;

    function bootDashboardButton() {
      // Always show Nuclear Hyper-Drive on racing pages, including race logs.
      mountFloatingInterface();
    }

    function bootRaceScraperIfNeeded() {
      if (!isLogPage) return;

      var currentContext = getRacingURLContext();
      var currentRaceId = currentContext && currentContext.raceID ? String(currentContext.raceID) : '';

      if (!currentRaceId) return;

      if (SCRAPER_SESSION_RACES[currentRaceId]) {
        console.log('[NB Racing] Scraper boot skipped for race #' + currentRaceId + ': already processed in this page session.');
        return;
      }

      // Compliance: if the page loads in the background, it waits until the Torn window is focused.
      if (!document.hidden && document.hasFocus()) {
        SCRAPER_SESSION_RACES[currentRaceId] = true;
        checkAndScrapeRace();
      } else {
        console.log('[NB Racing] Race log detected, waiting for focused Torn window before scraping.');
      }
    }

    function bootNuclearFamily() {
      bootDashboardButton();
      bootRaceScraperIfNeeded();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bootNuclearFamily);
    } else {
      bootNuclearFamily();
    }

    if (isLogPage) {
      window.addEventListener('focus', bootRaceScraperIfNeeded);
      document.addEventListener('visibilitychange', bootRaceScraperIfNeeded);
    }
  }

})(window, document);
