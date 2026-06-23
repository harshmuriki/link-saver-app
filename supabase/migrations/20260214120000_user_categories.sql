-- User-defined category catalog (built-ins stay implicit on links only).
CREATE TABLE IF NOT EXISTS public.user_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_categories_slug_format CHECK (slug ~ '^[a-z0-9_]{1,64}$'),
  UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_user_categories_user_id ON public.user_categories(user_id);

ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_categories_select_own" ON public.user_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_categories_insert_own" ON public.user_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_categories_delete_own" ON public.user_categories FOR DELETE
  USING (auth.uid() = user_id);
