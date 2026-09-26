CREATE TABLE admin_passkeys (
 id TEXT PRIMARY KEY,
 public_key TEXT NOT NULL,
 counter INTEGER NOT NULL DEFAULT 0,
 transports TEXT NOT NULL DEFAULT '[]',
 created_at INTEGER NOT NULL
);
CREATE TABLE admin_setup (
 id INTEGER PRIMARY KEY CHECK(id=1),
 token_hash TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE TABLE admin_sessions (
 token_hash TEXT PRIMARY KEY,
 credential_id TEXT NOT NULL REFERENCES admin_passkeys(id) ON DELETE CASCADE,
 authenticated_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE TABLE admin_challenges (
 token_hash TEXT PRIMARY KEY,
 challenge TEXT NOT NULL,
 purpose TEXT NOT NULL CHECK(purpose IN('register','login')),
 bootstrap_hash TEXT,
 session_hash TEXT,
 expires_at INTEGER NOT NULL
);
CREATE INDEX admin_sessions_expiry ON admin_sessions(expires_at);
CREATE INDEX admin_challenges_expiry ON admin_challenges(expires_at);
