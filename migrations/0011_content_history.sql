CREATE TABLE IF NOT EXISTS website_content_history (
 content_id TEXT NOT NULL,
 version INTEGER NOT NULL,
 data_json TEXT NOT NULL,
 saved_at TEXT NOT NULL,
 PRIMARY KEY(content_id,version)
);
-- Retain the ten previous versions of public website copy, never admin templates.
CREATE TRIGGER IF NOT EXISTS website_content_keep_history
AFTER UPDATE OF data_json ON website_content
WHEN OLD.id NOT LIKE 'admin:%' AND OLD.version <> NEW.version
BEGIN
 INSERT OR IGNORE INTO website_content_history(content_id,version,data_json,saved_at)
 VALUES(OLD.id,OLD.version,OLD.data_json,OLD.updated_at);
 DELETE FROM website_content_history WHERE content_id=OLD.id AND version NOT IN
 (SELECT version FROM website_content_history WHERE content_id=OLD.id ORDER BY version DESC LIMIT 10);
END;
