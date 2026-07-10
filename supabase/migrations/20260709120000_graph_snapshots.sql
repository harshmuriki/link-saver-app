-- Nightly knowledge-graph snapshot, one row per user (upserted by the local exporter).
CREATE TABLE IF NOT EXISTS public.graph_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE public.graph_snapshots ENABLE ROW LEVEL SECURITY;

-- Writes happen via the service-role admin client (bypasses RLS), so only a SELECT policy.
CREATE POLICY "graph_snapshots_select_own" ON public.graph_snapshots FOR SELECT
  USING (auth.uid() = user_id);
