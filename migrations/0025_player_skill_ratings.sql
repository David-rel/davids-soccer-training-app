ALTER TABLE players
ADD COLUMN IF NOT EXISTS first_touch_rating SMALLINT,
ADD COLUMN IF NOT EXISTS first_touch_notes TEXT,
ADD COLUMN IF NOT EXISTS one_v_one_ability_rating SMALLINT,
ADD COLUMN IF NOT EXISTS one_v_one_ability_notes TEXT,
ADD COLUMN IF NOT EXISTS passing_technique_rating SMALLINT,
ADD COLUMN IF NOT EXISTS passing_technique_notes TEXT,
ADD COLUMN IF NOT EXISTS shot_technique_rating SMALLINT,
ADD COLUMN IF NOT EXISTS shot_technique_notes TEXT,
ADD COLUMN IF NOT EXISTS vision_recognition_rating SMALLINT,
ADD COLUMN IF NOT EXISTS vision_recognition_notes TEXT,
ADD COLUMN IF NOT EXISTS great_soccer_habits_rating SMALLINT,
ADD COLUMN IF NOT EXISTS great_soccer_habits_notes TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'players_first_touch_rating_chk'
  ) THEN
    ALTER TABLE players
    ADD CONSTRAINT players_first_touch_rating_chk
    CHECK (first_touch_rating IS NULL OR first_touch_rating BETWEEN 1 AND 5);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'players_one_v_one_ability_rating_chk'
  ) THEN
    ALTER TABLE players
    ADD CONSTRAINT players_one_v_one_ability_rating_chk
    CHECK (one_v_one_ability_rating IS NULL OR one_v_one_ability_rating BETWEEN 1 AND 5);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'players_passing_technique_rating_chk'
  ) THEN
    ALTER TABLE players
    ADD CONSTRAINT players_passing_technique_rating_chk
    CHECK (passing_technique_rating IS NULL OR passing_technique_rating BETWEEN 1 AND 5);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'players_shot_technique_rating_chk'
  ) THEN
    ALTER TABLE players
    ADD CONSTRAINT players_shot_technique_rating_chk
    CHECK (shot_technique_rating IS NULL OR shot_technique_rating BETWEEN 1 AND 5);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'players_vision_recognition_rating_chk'
  ) THEN
    ALTER TABLE players
    ADD CONSTRAINT players_vision_recognition_rating_chk
    CHECK (vision_recognition_rating IS NULL OR vision_recognition_rating BETWEEN 1 AND 5);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'players_great_soccer_habits_rating_chk'
  ) THEN
    ALTER TABLE players
    ADD CONSTRAINT players_great_soccer_habits_rating_chk
    CHECK (great_soccer_habits_rating IS NULL OR great_soccer_habits_rating BETWEEN 1 AND 5);
  END IF;
END $$;
