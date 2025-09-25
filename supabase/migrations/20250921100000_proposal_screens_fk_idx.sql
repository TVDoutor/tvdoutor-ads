-- Ensure proposal_screens has proper FKs, indexes and unique constraint
-- Safe guards: create if not exists patterns via DO blocks

-- Foreign Key: proposal_id -> proposals.id (cascade on delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'proposal_screens' AND c.conname = 'proposal_screens_proposal_id_fkey'
  ) THEN
    ALTER TABLE public.proposal_screens
      ADD CONSTRAINT proposal_screens_proposal_id_fkey
      FOREIGN KEY (proposal_id)
      REFERENCES public.proposals(id)
      ON DELETE CASCADE;
  END IF;
END$$;

-- Foreign Key: screen_id -> screens.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'proposal_screens' AND c.conname = 'proposal_screens_screen_id_fkey'
  ) THEN
    ALTER TABLE public.proposal_screens
      ADD CONSTRAINT proposal_screens_screen_id_fkey
      FOREIGN KEY (screen_id)
      REFERENCES public.screens(id)
      ON DELETE RESTRICT;
  END IF;
END$$;

-- Unique pair (proposal_id, screen_id) to avoid duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'proposal_screens' AND c.conname = 'proposal_screens_proposal_screen_unique'
  ) THEN
    ALTER TABLE public.proposal_screens
      ADD CONSTRAINT proposal_screens_proposal_screen_unique
      UNIQUE (proposal_id, screen_id);
  END IF;
END$$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_proposal_screens_proposal_id ON public.proposal_screens(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_screens_screen_id ON public.proposal_screens(screen_id);

