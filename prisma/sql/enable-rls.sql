-- Active la Row Level Security sur toutes les tables du schéma public.
-- Aucune policy : anon et authenticated n'ont aucun accès via l'API Supabase.
-- Le backend se connecte en postgres (BYPASSRLS) et n'est pas impacté.
-- À relancer après chaque `prisma db push` qui crée une nouvelle table.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
