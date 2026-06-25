# Nuclear Family Backend — Step 1

Milestone: v6.2 — Reliable Data Pipeline  
Purpose: Create the simplest possible Cloudflare backend foundation.

This is only the starter backend package.

No userscript changes yet.

---

## What this backend will eventually do

```text
Steward opens completed race log
        ↓
Userscript scrapes race result
        ↓
POST /ingest-race
        ↓
Cloudflare Worker validates token
        ↓
Worker rejects duplicate race_id
        ↓
Worker stores race
        ↓
GET /standings returns rankings
```

---

## Files

```text
backend/
    worker.js
    schema.sql
    test-payload.json
    README.md
```

---

## Endpoints

### Health Check

```text
GET /health
```

Returns:

```json
{
  "ok": true,
  "service": "nuclear-family-backend"
}
```

---

### Ingest Race

```text
POST /ingest-race
```

Expected body:

```json
{
  "race_id": "123456",
  "scraped_at": "2026-06-24T12:00:00.000Z",
  "results": [
    {
      "position": "1st",
      "name": "DriverName",
      "time": "01:23.456"
    }
  ]
}
```

Requires header:

```text
Authorization: Bearer YOUR_STEWARD_TOKEN
```

---

### Standings

```text
GET /standings
```

Returns simple calculated standings based on stored results.

---

## Cloudflare Requirements

This starter expects:

- Cloudflare Worker
- Cloudflare D1 database binding named `DB`
- Secret named `STEWARD_TOKEN`

---

## Step 1 Goal

Upload these files to GitHub.

Do not deploy yet unless you feel comfortable.

Next step will be:

1. Create Cloudflare Worker.
2. Create D1 database.
3. Apply `schema.sql`.
4. Add `STEWARD_TOKEN`.
5. Test `/health`.
