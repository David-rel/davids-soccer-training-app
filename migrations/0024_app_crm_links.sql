ALTER TABLE parents
ADD COLUMN IF NOT EXISTS crm_parent_id INTEGER;

ALTER TABLE players
ADD COLUMN IF NOT EXISTS crm_player_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'parents_crm_parent_id_fkey'
  ) THEN
    ALTER TABLE parents
    ADD CONSTRAINT parents_crm_parent_id_fkey
    FOREIGN KEY (crm_parent_id) REFERENCES crm_parents(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'players_crm_player_id_fkey'
  ) THEN
    ALTER TABLE players
    ADD CONSTRAINT players_crm_player_id_fkey
    FOREIGN KEY (crm_player_id) REFERENCES crm_players(id) ON DELETE SET NULL;
  END IF;
END $$;

WITH parent_candidates AS (
  SELECT
    p.id AS parent_id,
    cp.id AS crm_parent_id,
    p.created_at AS parent_created_at,
    CASE
      WHEN lower(trim(coalesce(p.email, ''))) <> ''
           AND lower(trim(coalesce(cp.email, ''))) <> ''
           AND lower(trim(p.email)) = lower(trim(cp.email))
      THEN 1
      WHEN right(regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g'), 10) <> ''
           AND right(regexp_replace(coalesce(cp.phone, ''), '[^0-9]', '', 'g'), 10) <> ''
           AND right(regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g'), 10)
               = right(regexp_replace(coalesce(cp.phone, ''), '[^0-9]', '', 'g'), 10)
           AND lower(trim(coalesce(p.name, ''))) <> ''
           AND lower(trim(coalesce(cp.name, ''))) <> ''
           AND lower(trim(p.name)) = lower(trim(cp.name))
      THEN 2
      WHEN right(regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g'), 10) <> ''
           AND right(regexp_replace(coalesce(cp.phone, ''), '[^0-9]', '', 'g'), 10) <> ''
           AND right(regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g'), 10)
               = right(regexp_replace(coalesce(cp.phone, ''), '[^0-9]', '', 'g'), 10)
      THEN 3
      WHEN lower(trim(coalesce(p.name, ''))) <> ''
           AND lower(trim(coalesce(cp.name, ''))) <> ''
           AND lower(trim(p.name)) = lower(trim(cp.name))
      THEN 4
      ELSE 999
    END AS match_priority
  FROM parents p
  JOIN crm_parents cp
    ON (
      (lower(trim(coalesce(p.email, ''))) <> ''
       AND lower(trim(coalesce(cp.email, ''))) <> ''
       AND lower(trim(p.email)) = lower(trim(cp.email)))
      OR (
        right(regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g'), 10) <> ''
        AND right(regexp_replace(coalesce(cp.phone, ''), '[^0-9]', '', 'g'), 10) <> ''
        AND right(regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g'), 10)
            = right(regexp_replace(coalesce(cp.phone, ''), '[^0-9]', '', 'g'), 10)
      )
      OR (
        lower(trim(coalesce(p.name, ''))) <> ''
        AND lower(trim(coalesce(cp.name, ''))) <> ''
        AND lower(trim(p.name)) = lower(trim(cp.name))
      )
    )
  WHERE p.crm_parent_id IS NULL
),
ranked_parent_matches AS (
  SELECT
    parent_id,
    crm_parent_id,
    ROW_NUMBER() OVER (
      PARTITION BY parent_id
      ORDER BY match_priority ASC, crm_parent_id ASC
    ) AS parent_rank,
    ROW_NUMBER() OVER (
      PARTITION BY crm_parent_id
      ORDER BY match_priority ASC, parent_created_at ASC, parent_id ASC
    ) AS crm_rank
  FROM parent_candidates
)
UPDATE parents p
SET crm_parent_id = rpm.crm_parent_id
FROM ranked_parent_matches rpm
WHERE p.id = rpm.parent_id
  AND rpm.parent_rank = 1
  AND rpm.crm_rank = 1
  AND p.crm_parent_id IS NULL;

WITH player_candidates AS (
  SELECT
    pl.id AS player_id,
    cpl.id AS crm_player_id,
    pl.created_at AS player_created_at
  FROM players pl
  JOIN parents p
    ON p.id = pl.parent_id
  JOIN crm_players cpl
    ON cpl.parent_id = p.crm_parent_id
  WHERE pl.crm_player_id IS NULL
    AND p.crm_parent_id IS NOT NULL
    AND lower(trim(coalesce(pl.name, ''))) <> ''
    AND lower(trim(coalesce(cpl.name, ''))) <> ''
    AND lower(trim(pl.name)) = lower(trim(cpl.name))
),
ranked_player_matches AS (
  SELECT
    player_id,
    crm_player_id,
    ROW_NUMBER() OVER (
      PARTITION BY player_id
      ORDER BY crm_player_id ASC
    ) AS player_rank,
    ROW_NUMBER() OVER (
      PARTITION BY crm_player_id
      ORDER BY player_created_at ASC, player_id ASC
    ) AS crm_rank
  FROM player_candidates
)
UPDATE players pl
SET crm_player_id = rpm.crm_player_id
FROM ranked_player_matches rpm
WHERE pl.id = rpm.player_id
  AND rpm.player_rank = 1
  AND rpm.crm_rank = 1
  AND pl.crm_player_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS parents_crm_parent_id_unique_idx
ON parents (crm_parent_id)
WHERE crm_parent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS players_crm_player_id_unique_idx
ON players (crm_player_id)
WHERE crm_player_id IS NOT NULL;
