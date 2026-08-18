-- Extensions required by the search layer.
--   pg_trgm    : trigram similarity, powers typo-tolerant name/firm matching
--   unaccent   : fold diacritics so "Bhopal"/"Bhopāl" and transliterations match
--   btree_gin  : lets us mix scalar equality filters into GIN indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- An immutable unaccent wrapper. The stock unaccent() is STABLE, not IMMUTABLE,
-- so Postgres refuses to use it inside an expression index. This wrapper is the
-- standard workaround and is safe as long as the unaccent dictionary is fixed.
CREATE OR REPLACE FUNCTION lexhall_immutable_unaccent(text)
  RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
$$ SELECT public.unaccent('public.unaccent', $1) $$;

-- Text search configuration for Indian English legal content: English stemming
-- with diacritic folding applied first.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'lexhall_en') THEN
    CREATE TEXT SEARCH CONFIGURATION lexhall_en (COPY = english);
    ALTER TEXT SEARCH CONFIGURATION lexhall_en
      ALTER MAPPING FOR hword, hword_part, word
      WITH unaccent, english_stem;
  END IF;
END
$$;
