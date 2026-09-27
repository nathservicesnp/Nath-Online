ALTER TABLE enquiries ADD COLUMN callback_window TEXT NOT NULL DEFAULT '';
ALTER TABLE enquiries ADD COLUMN follow_up_at TEXT;
CREATE INDEX enquiries_follow_up ON enquiries(follow_up_at) WHERE status <> 'closed';
