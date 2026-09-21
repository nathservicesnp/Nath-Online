CREATE TABLE IF NOT EXISTS enquiries (
 reference TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 phone TEXT NOT NULL,
 service TEXT NOT NULL CHECK(service IN ('government','utilities','travel','banking','education','other')),
 message TEXT NOT NULL,
 consent_version TEXT NOT NULL,
 idempotency_key TEXT NOT NULL UNIQUE,
 payload_hash TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','in_progress','closed')),
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now')),
 closed_at TEXT
);
CREATE INDEX IF NOT EXISTS enquiries_status_created ON enquiries(status,created_at);
