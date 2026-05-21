PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  location TEXT,
  password_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  tower_height_m REAL NOT NULL,
  tower_type TEXT NOT NULL,
  status TEXT NOT NULL,
  region TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  category TEXT NOT NULL,
  frequency_range TEXT,
  power_dbm REAL,
  gain_dbi REAL,
  stock INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  site_a_id TEXT NOT NULL,
  site_b_id TEXT NOT NULL,
  frequency_ghz REAL NOT NULL,
  tx_power_dbm REAL NOT NULL,
  antenna_gain_dbi REAL NOT NULL,
  cable_loss_db REAL NOT NULL DEFAULT 2,
  status TEXT NOT NULL,
  distance_km REAL NOT NULL,
  fspl_db REAL NOT NULL,
  rsl_dbm REAL NOT NULL,
  availability_pct REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_a_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (site_b_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS simulations (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL,
  fspl_db REAL NOT NULL,
  rsl_dbm REAL NOT NULL,
  fade_margin_db REAL NOT NULL,
  fresnel_clearance_pct REAL NOT NULL,
  availability_pct REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL,
  file_path TEXT,
  size_label TEXT NOT NULL,
  author TEXT NOT NULL,
  link_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);
CREATE INDEX IF NOT EXISTS idx_sites_region ON sites(region);
CREATE INDEX IF NOT EXISTS idx_links_status ON links(status);
CREATE INDEX IF NOT EXISTS idx_links_site_a ON links(site_a_id);
CREATE INDEX IF NOT EXISTS idx_links_site_b ON links(site_b_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
