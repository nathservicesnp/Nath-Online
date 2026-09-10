CREATE TABLE IF NOT EXISTS requests (
 id TEXT PRIMARY KEY,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
 kind TEXT NOT NULL CHECK(kind IN ('service','career')),
 name TEXT NOT NULL,
 phone TEXT NOT NULL,
 interest TEXT NOT NULL,
 message TEXT NOT NULL,
 consent_version TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','in_progress','closed'))
);
CREATE INDEX IF NOT EXISTS requests_status_created ON requests(status, created_at DESC);
