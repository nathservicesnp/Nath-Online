ALTER TABLE enquiries ADD COLUMN quote_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE enquiries ADD COLUMN paid_paisa INTEGER NOT NULL DEFAULT 0;
ALTER TABLE enquiries ADD COLUMN finance_version INTEGER NOT NULL DEFAULT 0;
CREATE TABLE finance_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 reference TEXT NOT NULL REFERENCES enquiries(reference) ON DELETE CASCADE,
 actor TEXT NOT NULL,
 quote_json TEXT NOT NULL,
 paid_paisa INTEGER NOT NULL,
 payment_note TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
