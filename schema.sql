-- Nuclear Family Backend Schema
-- Version: v6.2-step1

CREATE TABLE IF NOT EXISTS races (
    race_id TEXT PRIMARY KEY,
    scraped_at TEXT NOT NULL,
    received_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS race_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    race_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    driver_name TEXT NOT NULL,
    race_time TEXT,
    points INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (race_id) REFERENCES races(race_id)
);

CREATE INDEX IF NOT EXISTS idx_race_results_race_id
ON race_results (race_id);

CREATE INDEX IF NOT EXISTS idx_race_results_driver_name
ON race_results (driver_name);
