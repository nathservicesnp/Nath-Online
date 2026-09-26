CREATE TABLE website_content (
 id TEXT PRIMARY KEY,
 data_json TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
ALTER TABLE enquiries ADD COLUMN quote_shared INTEGER NOT NULL DEFAULT 0;
ALTER TABLE enquiries ADD COLUMN quote_revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE enquiries ADD COLUMN accepted_revision INTEGER;
ALTER TABLE enquiries ADD COLUMN accepted_at TEXT;
ALTER TABLE enquiries ADD COLUMN payment_instructions TEXT NOT NULL DEFAULT '';
CREATE TABLE quote_acceptances (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 reference TEXT NOT NULL REFERENCES enquiries(reference) ON DELETE CASCADE,
 revision INTEGER NOT NULL,
 quote_json TEXT NOT NULL,
 accepted_at TEXT NOT NULL DEFAULT (datetime('now')),
 UNIQUE(reference,revision)
);
