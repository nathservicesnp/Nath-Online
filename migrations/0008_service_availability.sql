ALTER TABLE service_catalog ADD COLUMN availability TEXT NOT NULL DEFAULT 'available' CHECK(availability IN ('available','paused','soon'));
