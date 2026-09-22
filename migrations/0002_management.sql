ALTER TABLE enquiries ADD COLUMN service_id TEXT;
ALTER TABLE enquiries ADD COLUMN service_title TEXT;
ALTER TABLE enquiries ADD COLUMN outcome TEXT NOT NULL DEFAULT '' CHECK(outcome IN ('','completed','cancelled','declined'));
ALTER TABLE enquiries ADD COLUMN internal_note TEXT NOT NULL DEFAULT '';
ALTER TABLE enquiries ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
UPDATE enquiries SET service_id=service WHERE service_id IS NULL;
CREATE TABLE request_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 reference TEXT NOT NULL REFERENCES enquiries(reference) ON DELETE CASCADE,
 actor TEXT NOT NULL,
 action TEXT NOT NULL,
 from_status TEXT,
 to_status TEXT NOT NULL,
 outcome TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE INDEX request_events_reference ON request_events(reference,id);
CREATE TABLE service_catalog (
 id TEXT PRIMARY KEY,
 category TEXT NOT NULL CHECK(category IN ('government','utilities','travel','banking','education','other')),
 icon TEXT NOT NULL,
 title_en TEXT NOT NULL,
 title_ne TEXT NOT NULL,
 description_en TEXT NOT NULL,
 description_ne TEXT NOT NULL,
 note_en TEXT NOT NULL,
 note_ne TEXT NOT NULL,
 items_json TEXT NOT NULL,
 starting_price INTEGER NOT NULL DEFAULT 100 CHECK(starting_price>=100),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),
 sort_order INTEGER NOT NULL DEFAULT 100,
 version INTEGER NOT NULL DEFAULT 1,
 last_actor TEXT NOT NULL DEFAULT 'initial_setup',
 updated_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE TABLE service_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 service_id TEXT NOT NULL,
 actor TEXT NOT NULL,
 action TEXT NOT NULL,
 version INTEGER NOT NULL,
 created_at TEXT NOT NULL DEFAULT(datetime('now'))
);
