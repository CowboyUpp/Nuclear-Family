// Nuclear Family League Server
// Backend Version: v1.0.2
//
// Cloudflare bindings expected:
// - DB: D1 database
// - STEWARD_TOKEN: Worker secret
// - ADMIN_TOKEN: Worker secret

const SERVICE_NAME = "nuclear-family-league-server";
const BACKEND_VERSION = "v1.0.2";

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
    if (request.method === "POST" && url.pathname === "/ingest-race") return handleIngestRace(request, env);
    if (request.method === "GET" && url.pathname === "/standings") return handleStandings(env);

    return jsonResponse({ ok: false, error: "Not found" }, 404);
  }
};

async function handleHealth(env) {
  let databaseStatus = "unknown";
  try {
    await env.DB.prepare("SELECT 1 AS ok").first();
    databaseStatus = "connected";
  } catch (error) {
    databaseStatus = "error";
  }

  return jsonResponse({
    ok: true,
    service: SERVICE_NAME,
    version: BACKEND_VERSION,
    database: databaseStatus,
    environment: "production"
  });
}

async function handleAdminHealth(request, env) {
  const authError = validateAdminAuthorization(request, env);
  if (authError) return authError;

  return jsonResponse({
    ok: true,
    role: "admin",
    service: SERVICE_NAME,
    version: BACKEND_VERSION
  });
}

async function handleIngestRace(request, env) {
  const authError = validateAuthorization(request, env);
  if (authError) return authError;

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

  await env.DB.prepare("INSERT INTO races (race_id, scraped_at, received_at) VALUES (?, ?, ?)")
    .bind(raceId, payload.scraped_at, receivedAt)
    .run();

  for (const result of payload.results) {
    const position = normalizePosition(result.position);
    const points = POINTS_BY_POSITION[position] || 0;

    await env.DB.prepare("INSERT INTO race_results (race_id, position, driver_name, race_time, points) VALUES (?, ?, ?, ?, ?)")
      .bind(raceId, position, String(result.name || "").trim(), result.time ? String(result.time).trim() : null, points)
      .run();
  }

  return jsonResponse({ ok: true, message: "Race ingested", race_id: raceId, results: payload.results.length });
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

function validateAdminAuthorization(request, env) {
  if (!env.ADMIN_TOKEN) {
    return jsonResponse({ ok: false, error: "Server missing ADMIN_TOKEN secret" }, 500);
  }

  const authHeader = request.headers.get("Authorization") || "";
  const expected = "Bearer " + env.ADMIN_TOKEN;

  if (authHeader !== expected) {
    return jsonResponse({ ok: false, error: "Unauthorized admin" }, 401);
  }

  return null;
}

function validateAuthorization(request, env) {
  if (!env.STEWARD_TOKEN) return jsonResponse({ ok: false, error: "Server missing STEWARD_TOKEN secret" }, 500);

  const authHeader = request.headers.get("Authorization") || "";
  const expected = "Bearer " + env.STEWARD_TOKEN;

  if (authHeader !== expected) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  return null;
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

function jsonResponse(data, status = 200) {
  return corsResponse(JSON.stringify(data, null, 2), status, { "Content-Type": "application/json" });
}

function corsResponse(body, status = 200, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      ...extraHeaders
    }
  });
}
