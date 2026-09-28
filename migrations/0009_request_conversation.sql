ALTER TABLE enquiries ADD COLUMN conversation_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE enquiries ADD COLUMN waiting_customer INTEGER NOT NULL DEFAULT 0;
CREATE TABLE request_messages (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 reference TEXT NOT NULL REFERENCES enquiries(reference) ON DELETE CASCADE,
 waiting INTEGER NOT NULL DEFAULT 0,
 sender TEXT NOT NULL CHECK(sender IN ('team','customer')),
 body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 1500),
 retry_key TEXT NOT NULL,
 actor TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 UNIQUE(reference,retry_key)
);
CREATE INDEX request_messages_reference ON request_messages(reference,id);
