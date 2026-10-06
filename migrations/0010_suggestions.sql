CREATE TABLE IF NOT EXISTS suggestions (
 id TEXT PRIMARY KEY,
 payload TEXT NOT NULL,
 category TEXT NOT NULL,
 message TEXT NOT NULL,
 phone TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'new',
 note TEXT NOT NULL DEFAULT '',
 duplicate_of TEXT NOT NULL DEFAULT '',
 version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS suggestions_status ON suggestions(status,created_at);
