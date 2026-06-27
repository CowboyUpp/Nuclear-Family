// Nuclear Family League Server
// Backend Version: v1.0.7
//
// Cloudflare bindings expected:
// - DB: D1 database
// - STEWARD_TOKEN: Worker secret
// - ADMIN_TOKEN: Worker secret

const SERVICE_NAME = "nuclear-family-league-server";
const BACKEND_VERSION = "v1.0.7";

const POINTS_BY_POSITION = {
  1: 25, 2: 18, 3: 15, 4: 12, 5: 10,
  6: 8, 7: 6, 8: 4, 9: 2, 10: 1
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return corsResponse(null, 204);

    if (request.method === "GET" && url.pathname === "/health") return handleHealth(env);
    if (request.method === "GET" && url.pathname === "/admin/health") return handleAdminHealth(request, env);
    if (request.method === "GET" && url.pathname === "/admin/config-check") return handleAdminConfigCheck(request, env);
    if (request.method === "POST" && url.pathname === "/auth/login") return handleStewardLogin(request, env);
    if (request.method === "GET" && url.pathname === "/admin/stewards") return handleAdminListStewards(request, env);
    if (request.method === "POST" && url.pathname === "/admin/stewards") return handleAdminCreateSteward(request, env);

    const stewardAction = parseStewardAction(url.pathname);
    if (stewardAction && request.method === "PATCH" && stewardAction.action === "update") return handleAdminUpdateSteward(request, env, stewardAction.id);
    if (stewardAction && request.method === "POST" && stewardAction.action === "disable") return handleAdminSetStewardActive(request, env, stewardAction.id, 0);
    if (stewardAction && request.method === "POST" && stewardAction.action === "enable") return handleAdminSetStewardActive(request, env, stewardAction.id, 1);
    if (stewardAction && request.method === "POST" && stewardAction.action === "regenerate-token") return handleAdminRegenerateStewardToken(request, env, stewardAction.id);
    if (request.method === "POST" && url.pathname === "/ingest-race") return handleIngestRace(request, env);
    if (request.method === "GET" && url.pathname === "/standings") return handleStandings(env);
    if (request.method === "GET" && url.pathname === "/race-status") return handleRaceStatus(request, env);

    return jsonResponse({ ok: false, error: "Not found" }, 404);
  }
};

async function handleHealth(env) {
  const checks = await runConfigChecks(env, false);

  return jsonResponse({
    ok: true,
    service: SERVICE_NAME,
    version: BACKEND_VERSION,
    database: checks.db.status,
    environment: "production"
  });
}

async function handleAdminHealth(request, env) {
  const authError = await validateAdminAuthorization(request, env);
  if (authError) return authError;
  const actorForAudit = await resolveActorFromAuthorization(request, env);

  return jsonResponse({
    ok: true,
    role: "admin",
    service: SERVICE_NAME,
    version: BACKEND_VERSION
  });
}

async function handleAdminConfigCheck(request, env) {
  const authError = await validateAdminAuthorization(request, env);
  if (authError) return authError;

  const checks = await runConfigChecks(env, true);

  return jsonResponse({
    ok: checks.overall === "ready",
    role: "admin",
    service: SERVICE_NAME,
    version: BACKEND_VERSION,
    overall: checks.overall,
    checks: checks
  });
}

async function runConfigChecks(env, includeTables) {
  const checks = {
    overall: "ready",
    db: { status: "unknown" },
    admin_token: { status: env.ADMIN_TOKEN ? "present" : "missing" },
    steward_token: { status: env.STEWARD_TOKEN ? "present" : "missing" },
    tables: {}
  };

  if (!env.ADMIN_TOKEN || !env.STEWARD_TOKEN) checks.overall = "not_ready";

  try {
    await env.DB.prepare("SELECT 1 AS ok").first();
    checks.db.status = "connected";
  } catch (error) {
    checks.db.status = "error";
    checks.db.error = String(error && error.message ? error.message : error);
    checks.overall = "not_ready";
  }

  if (includeTables && checks.db.status === "connected") {
    const tableNames = ["races", "race_results", "stewards", "steward_sessions", "audit_log"];
    for (const tableName of tableNames) {
      try {
        await env.DB.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).first();
        checks.tables[tableName] = { status: "ok" };
      } catch (error) {
        checks.tables[tableName] = {
          status: "missing_or_error",
          error: String(error && error.message ? error.message : error)
        };
        if (tableName !== "stewards") checks.overall = "not_ready";
      }
    }
  }

  return checks;
}

async function handleAdminListStewards(request, env) {
  const authError = await validateAdminAuthorization(request, env);
  if (authError) return authError;

  try {
    const rows = await env.DB.prepare(`
      SELECT
        id,
        torn_id,
        display_name,
        role,
        active,
        created_at,
        last_seen_at,
        script_version,
        notes
      FROM stewards
      ORDER BY active DESC, role ASC, display_name ASC
    `).all();

    return jsonResponse({
      ok: true,
      stewards: rows.results || []
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: "Steward registry table missing or unavailable",
      detail: String(error && error.message ? error.message : error)
    }, 500);
  }
}

async function handleAdminCreateSteward(request, env) {
  const authError = await validateAdminAuthorization(request, env);
  if (authError) return authError;

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const tornId = sanitizeText(payload.torn_id, 24);
  const displayName = sanitizeText(payload.display_name, 48);
  const role = normalizeRole(payload.role);
  const notes = sanitizeText(payload.notes || "", 200);

  if (!tornId || !/^\d{1,12}$/.test(tornId)) {
    return jsonResponse({ ok: false, error: "torn_id must be numeric" }, 400);
  }

  if (!displayName) {
    return jsonResponse({ ok: false, error: "display_name is required" }, 400);
  }

  const rawToken = generateToken("nf_steward");
  const tokenHash = await sha256Hex(rawToken);
  const now = new Date().toISOString();

  try {
    await env.DB.prepare(`
      INSERT INTO stewards
        (torn_id, display_name, role, token_hash, active, created_at, notes)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).bind(tornId, displayName, role, tokenHash, now, notes).run();

    return jsonResponse({
      ok: true,
      steward: {
        torn_id: tornId,
        display_name: displayName,
        role: role,
        active: 1,
        created_at: now
      },
      token_once: rawToken,
      warning: "Copy token_once now. It is stored only as a hash and cannot be recovered later."
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: "Could not create steward",
      detail: String(error && error.message ? error.message : error)
    }, 500);
  }
}



async function writeAuditLog(env, actor, action, targetType, targetId, details) {
  try {
    await env.DB.prepare(`
      INSERT INTO audit_log (created_at, actor_id, actor_torn_id, actor_name, actor_role, action, target_type, target_id, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      new Date().toISOString(),
      actor && actor.id ? actor.id : null,
      actor && actor.torn_id ? actor.torn_id : null,
      actor && actor.display_name ? actor.display_name : null,
      actor && actor.role ? actor.role : null,
      action || "",
      targetType || null,
      targetId !== undefined && targetId !== null ? String(targetId) : null,
      details ? JSON.stringify(details).slice(0, 2000) : null
    ).run();
  } catch (error) {
    console.warn("Audit log write failed:", error && error.message ? error.message : error);
  }
}

async function resolveActorFromAuthorization(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;
  if (env.ADMIN_TOKEN && token === env.ADMIN_TOKEN) return { id: null, torn_id: "bootstrap", display_name: "Emergency Bootstrap", role: "bootstrap" };
  try {
    const tokenHash = await sha256Hex(token);
    return await env.DB.prepare(`
      SELECT s.id, s.torn_id, s.display_name, s.role, s.active
      FROM steward_sessions ss
      JOIN stewards s ON s.id = ss.steward_id
      WHERE ss.session_hash = ? AND ss.expires_at > ?
      LIMIT 1
    `).bind(tokenHash, new Date().toISOString()).first();
  } catch (error) {
    return null;
  }
}

async function handleStewardLogin(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const tornId = sanitizeText(payload.torn_id, 24);
  const token = String(payload.token || "").trim();

  if (!tornId || !/^\d{1,12}$/.test(tornId)) return jsonResponse({ ok: false, error: "torn_id must be numeric" }, 400);
  if (!token) return jsonResponse({ ok: false, error: "token is required" }, 400);

  try {
    const tokenHash = await sha256Hex(token);
    const steward = await env.DB.prepare(`
      SELECT id, torn_id, display_name, role, active, created_at, last_seen_at, script_version, notes
      FROM stewards
      WHERE torn_id = ? AND token_hash = ?
      LIMIT 1
    `).bind(tornId, tokenHash).first();

    if (!steward) return jsonResponse({ ok: false, error: "Invalid Torn ID or token" }, 401);
    if (Number(steward.active) !== 1) return jsonResponse({ ok: false, error: "Steward disabled" }, 403);

    const rawSession = generateToken("nf_session");
    const sessionHash = await sha256Hex(rawSession);
    const now = new Date();
    const expires = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();

    await env.DB.prepare(`
      INSERT INTO steward_sessions (steward_id, session_hash, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `).bind(steward.id, sessionHash, now.toISOString(), expires).run();

    await env.DB.prepare("UPDATE stewards SET last_seen_at = ? WHERE id = ?")
      .bind(now.toISOString(), steward.id)
      .run();

    await writeAuditLog(env, steward, "login", "steward", steward.id, { expires_at: expires });

    return jsonResponse({
      ok: true,
      session_token: rawSession,
      expires_at: expires,
      steward: {
        id: steward.id,
        torn_id: steward.torn_id,
        display_name: steward.display_name,
        role: steward.role,
        active: steward.active
      },
      permissions: {
        steward_admin: steward.role === "super_admin" || steward.role === "admin"
      }
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: "Login failed",
      detail: String(error && error.message ? error.message : error)
    }, 500);
  }
}

function parseStewardAction(pathname) {
  const match = pathname.match(/^\/admin\/stewards\/(\d+)(?:\/([a-z-]+))?$/);
  if (!match) return null;

  return {
    id: Number(match[1]),
    action: match[2] || "update"
  };
}

async function handleAdminUpdateSteward(request, env, stewardId) {
  const authError = await validateAdminAuthorization(request, env);
  if (authError) return authError;

  if (!stewardId || stewardId < 1) return jsonResponse({ ok: false, error: "Invalid steward id" }, 400);

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const displayName = sanitizeText(payload.display_name, 48);
  const role = normalizeRole(payload.role);
  const notes = sanitizeText(payload.notes || "", 200);

  if (!displayName) return jsonResponse({ ok: false, error: "display_name is required" }, 400);

  const existing = await env.DB.prepare("SELECT id FROM stewards WHERE id = ?").bind(stewardId).first();
  if (!existing) return jsonResponse({ ok: false, error: "Steward not found" }, 404);

  await env.DB.prepare(`
    UPDATE stewards
    SET display_name = ?, role = ?, notes = ?
    WHERE id = ?
  `).bind(displayName, role, notes, stewardId).run();

  const updated = await env.DB.prepare(`
    SELECT id, torn_id, display_name, role, active, created_at, last_seen_at, script_version, notes
    FROM stewards
    WHERE id = ?
  `).bind(stewardId).first();

  await writeAuditLog(env, actorForAudit, "steward_update", "steward", stewardId, { display_name: displayName, role: role });

  await writeAuditLog(env, actorForAudit, "steward_active_change", "steward", stewardId, { active: active });

  return jsonResponse({ ok: true, steward: updated });
}

async function handleAdminSetStewardActive(request, env, stewardId, active) {
  const authError = await validateAdminAuthorization(request, env);
  if (authError) return authError;
  const actorForAudit = await resolveActorFromAuthorization(request, env);

  if (!stewardId || stewardId < 1) return jsonResponse({ ok: false, error: "Invalid steward id" }, 400);

  const existing = await env.DB.prepare("SELECT id FROM stewards WHERE id = ?").bind(stewardId).first();
  if (!existing) return jsonResponse({ ok: false, error: "Steward not found" }, 404);

  await env.DB.prepare("UPDATE stewards SET active = ? WHERE id = ?").bind(active, stewardId).run();

  const updated = await env.DB.prepare(`
    SELECT id, torn_id, display_name, role, active, created_at, last_seen_at, script_version, notes
    FROM stewards
    WHERE id = ?
  `).bind(stewardId).first();

  return jsonResponse({ ok: true, steward: updated });
}

async function handleAdminRegenerateStewardToken(request, env, stewardId) {
  const authError = await validateAdminAuthorization(request, env);
  if (authError) return authError;
  const actorForAudit = await resolveActorFromAuthorization(request, env);

  if (!stewardId || stewardId < 1) return jsonResponse({ ok: false, error: "Invalid steward id" }, 400);

  const existing = await env.DB.prepare(`
    SELECT id, torn_id, display_name, role, active
    FROM stewards
    WHERE id = ?
  `).bind(stewardId).first();

  if (!existing) return jsonResponse({ ok: false, error: "Steward not found" }, 404);

  const rawToken = generateToken("nf_steward");
  const tokenHash = await sha256Hex(rawToken);

  await env.DB.prepare("UPDATE stewards SET token_hash = ? WHERE id = ?").bind(tokenHash, stewardId).run();

  await writeAuditLog(env, actorForAudit, "steward_token_regenerate", "steward", stewardId, {});

  return jsonResponse({
    ok: true,
    steward: existing,
    token_once: rawToken,
    warning: "Copy token_once now. It is stored only as a hash and cannot be recovered later."
  });
}

async function handleIngestRace(request, env) {
  const authResult = await validateUploadAuthorization(request, env);
  if (authResult.errorResponse) return authResult.errorResponse;

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const validationError = validateRacePayload(payload);
  if (validationError) return validationError;

  const raceId = String(payload.race_id).trim();

  const existing = await env.DB.prepare("SELECT race_id FROM races WHERE race_id = ?").bind(raceId).first();
  if (existing) return jsonResponse({ ok: false, error: "Duplicate race_id", race_id: raceId }, 409);

  const receivedAt = new Date().toISOString();

  await env.DB.prepare("INSERT INTO races (race_id, scraped_at, received_at, fingerprint) VALUES (?, ?, ?, ?)")
    .bind(raceId, payload.scraped_at, receivedAt, payload.fingerprint || null)
    .run();

  for (const result of payload.results) {
    const position = normalizePosition(result.position);
    const points = POINTS_BY_POSITION[position] || 0;

    await env.DB.prepare("INSERT INTO race_results (race_id, position, driver_name, race_time, points) VALUES (?, ?, ?, ?, ?)")
      .bind(raceId, position, String(result.name || "").trim(), result.time ? String(result.time).trim() : null, points)
      .run();
  }

  return jsonResponse({
    ok: true,
    message: "Race ingested",
    race_id: raceId,
    results: payload.results.length,
    steward: authResult.steward ? {
      id: authResult.steward.id,
      display_name: authResult.steward.display_name,
      role: authResult.steward.role
    } : null,
    auth_mode: authResult.mode
  });
}

async function handleRaceStatus(request, env) {
  const url = new URL(request.url);
  const raceId = String(url.searchParams.get("race_id") || "").trim();

  if (!raceId) return jsonResponse({ ok: false, error: "Missing race_id" }, 400);

  const race = await env.DB.prepare(`
    SELECT race_id, scraped_at, received_at, fingerprint
    FROM races
    WHERE race_id = ?
  `).bind(raceId).first();

  if (!race) return jsonResponse({ ok: true, exists: false, race_id: raceId });

  const count = await env.DB.prepare(`
    SELECT COUNT(*) AS result_count
    FROM race_results
    WHERE race_id = ?
  `).bind(raceId).first();

  return jsonResponse({
    ok: true,
    exists: true,
    race_id: raceId,
    fingerprint: race.fingerprint || null,
    scraped_at: race.scraped_at || null,
    received_at: race.received_at || null,
    result_count: count && count.result_count ? count.result_count : 0
  });
}

async function handleStandings(env) {
  const rows = await env.DB.prepare(`
    SELECT
      driver_name,
      NULL AS faction,
      SUM(points) AS points,
      COUNT(*) AS races,
      SUM(CASE WHEN position = 1 THEN 1 ELSE 0 END) AS wins,
      SUM(CASE WHEN position <= 3 THEN 1 ELSE 0 END) AS podiums,
      MIN(position) AS best_finish,
      ROUND(AVG(position), 2) AS avg_finish
    FROM race_results
    GROUP BY driver_name
    ORDER BY points DESC, wins DESC, podiums DESC, avg_finish ASC, driver_name ASC
  `).all();

  return jsonResponse({ ok: true, standings: rows.results || [] });
}

async function validateAdminAuthorization(request, env) {
  if (!env.ADMIN_TOKEN) return jsonResponse({ ok: false, error: "Server missing ADMIN_TOKEN secret" }, 500);

  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) return jsonResponse({ ok: false, error: "Unauthorized admin" }, 401);

  if (token === env.ADMIN_TOKEN) return null;

  try {
    const tokenHash = await sha256Hex(token);
    const row = await env.DB.prepare(`
      SELECT
        ss.id AS session_id,
        ss.expires_at,
        s.id AS steward_id,
        s.torn_id,
        s.display_name,
        s.role,
        s.active
      FROM steward_sessions ss
      JOIN stewards s ON s.id = ss.steward_id
      WHERE ss.session_hash = ?
      LIMIT 1
    `).bind(tokenHash).first();

    if (!row) return jsonResponse({ ok: false, error: "Unauthorized admin" }, 401);
    if (Number(row.active) !== 1) return jsonResponse({ ok: false, error: "Steward disabled" }, 403);

    const now = new Date();
    const expires = new Date(row.expires_at);
    if (!row.expires_at || expires <= now) return jsonResponse({ ok: false, error: "Session expired" }, 401);

    const role = String(row.role || "");
    if (role !== "super_admin" && role !== "admin") return jsonResponse({ ok: false, error: "Insufficient role" }, 403);

    await env.DB.prepare("UPDATE stewards SET last_seen_at = ? WHERE id = ?")
      .bind(now.toISOString(), row.steward_id)
      .run();

    return null;
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: "Admin session validation failed",
      detail: String(error && error.message ? error.message : error)
    }, 500);
  }
}



async function validateUploadAuthorization(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);

  try {
    const tokenHash = await sha256Hex(token);
    const row = await env.DB.prepare(`
      SELECT s.id, s.torn_id, s.display_name, s.role, s.active
      FROM steward_sessions ss
      JOIN stewards s ON s.id = ss.steward_id
      WHERE ss.session_hash = ? AND ss.expires_at > ?
      LIMIT 1
    `).bind(tokenHash, new Date().toISOString()).first();

    if (row) {
      if (Number(row.active) !== 1) return jsonResponse({ ok: false, error: "Steward disabled" }, 403);
      const role = String(row.role || "");
      if (!["super_admin", "admin", "chief", "event"].includes(role)) return jsonResponse({ ok: false, error: "Insufficient upload role" }, 403);
      request.stewardActor = row;
      return null;
    }
  } catch (error) {
    return jsonResponse({ ok: false, error: "Upload session validation failed" }, 500);
  }

  if (env.STEWARD_TOKEN && token === env.STEWARD_TOKEN) {
    request.stewardActor = { id: null, torn_id: "legacy", display_name: "Legacy Steward Token", role: "legacy" };
    return null;
  }

  return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
}

function validateRacePayload(payload) {
  if (!payload || typeof payload !== "object") return jsonResponse({ ok: false, error: "Payload must be an object" }, 400);
  if (!payload.race_id) return jsonResponse({ ok: false, error: "Missing race_id" }, 400);
  if (!payload.scraped_at) return jsonResponse({ ok: false, error: "Missing scraped_at" }, 400);
  if (!Array.isArray(payload.results)) return jsonResponse({ ok: false, error: "results must be an array" }, 400);
  if (payload.results.length === 0) return jsonResponse({ ok: false, error: "results cannot be empty" }, 400);

  for (const result of payload.results) {
    const position = normalizePosition(result.position);
    if (!position || position < 1) return jsonResponse({ ok: false, error: "Invalid result position" }, 400);
    if (!result.name || !String(result.name).trim()) return jsonResponse({ ok: false, error: "Missing driver name" }, 400);
  }

  return null;
}

function normalizePosition(value) {
  if (typeof value === "number") return value;
  const text = String(value || "").trim();
  const match = text.match(/\d+/);
  if (!match) return 0;
  return Number(match[0]);
}

function normalizeRole(role) {
  const value = String(role || "event").toLowerCase();
  const allowed = new Set(["super_admin", "admin", "chief", "event", "observer"]);
  return allowed.has(value) ? value : "event";
}

function sanitizeText(value, maxLength) {
  const text = String(value === undefined || value === null ? "" : value)
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();

  return maxLength && text.length > maxLength ? text.slice(0, maxLength) : text;
}

function generateToken(prefix) {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${token}`;
}

async function sha256Hex(value) {
  const data = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function jsonResponse(data, status = 200) {
  return corsResponse(JSON.stringify(data, null, 2), status, { "Content-Type": "application/json" });
}

function corsResponse(body, status = 200, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      ...extraHeaders
    }
  });
}
