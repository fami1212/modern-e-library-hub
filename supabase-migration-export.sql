-- ============================================================
-- MIGRATION COMPLÈTE — À exécuter dans le SQL Editor
-- du nouveau projet Supabase (lljpjxqktvlfogoguina)
-- Ordre: ENUM → TABLES → GRANTS → RLS → POLICIES → FUNCTIONS
--        → TRIGGERS → BUCKETS → STORAGE POLICIES
-- Idempotent : peut être relancé sans erreur.
-- ============================================================

-- 1. ENUM ------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. TABLES ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  description TEXT,
  cover_url TEXT,
  pdf_url TEXT,
  category TEXT,
  publication_year INTEGER,
  total_copies INTEGER NOT NULL DEFAULT 1,
  available_copies INTEGER NOT NULL DEFAULT 1,
  owner_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.borrowings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  book_id UUID NOT NULL,
  borrowed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  admin_validated BOOLEAN DEFAULT false,
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  extension_count INTEGER DEFAULT 0,
  max_extensions INTEGER DEFAULT 2,
  fine_amount NUMERIC DEFAULT 0,
  fine_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  book_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);

CREATE TABLE IF NOT EXISTS public.book_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nouvelle conversation',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  book_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  pages_read INTEGER DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. GRANTS (indispensable pour l'API PostgREST) --------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON public.profiles       TO anon;
GRANT SELECT ON public.user_roles     TO anon;
GRANT SELECT ON public.books          TO anon;
GRANT SELECT ON public.book_reviews   TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.books            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.borrowings       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_reviews     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_sessions TO authenticated;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role, authenticated;

-- 4. FUNCTIONS -------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- 5. TRIGGERS --------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY['profiles','books','book_reviews','conversations','reading_sessions']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()', t, t);
  END LOOP;
END $$;

-- 6. ENABLE RLS ------------------------------------------------
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_reviews     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;

-- 7. POLICIES (drop-if-exists puis create) ---------------------
-- PROFILES
DROP POLICY IF EXISTS "profiles_select_all"      ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"      ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- USER_ROLES
DROP POLICY IF EXISTS "user_roles_select_all"  ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_all"   ON public.user_roles;
CREATE POLICY "user_roles_select_all" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "user_roles_admin_all"  ON public.user_roles FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- BOOKS
DROP POLICY IF EXISTS "books_select_all"     ON public.books;
DROP POLICY IF EXISTS "books_insert_auth"    ON public.books;
DROP POLICY IF EXISTS "books_update_owner"   ON public.books;
DROP POLICY IF EXISTS "books_delete_owner"   ON public.books;
CREATE POLICY "books_select_all"   ON public.books FOR SELECT USING (true);
CREATE POLICY "books_insert_auth"  ON public.books FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "books_update_owner" ON public.books FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR auth.uid() = owner_id);
CREATE POLICY "books_delete_owner" ON public.books FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR auth.uid() = owner_id);

-- BORROWINGS
DROP POLICY IF EXISTS "borrow_select"        ON public.borrowings;
DROP POLICY IF EXISTS "borrow_insert_own"    ON public.borrowings;
DROP POLICY IF EXISTS "borrow_update_self_or_admin" ON public.borrowings;
DROP POLICY IF EXISTS "borrow_delete_admin"  ON public.borrowings;
CREATE POLICY "borrow_select" ON public.borrowings FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "borrow_insert_own" ON public.borrowings FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "borrow_update_self_or_admin" ON public.borrowings FOR UPDATE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "borrow_delete_admin" ON public.borrowings FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- FAVORITES
DROP POLICY IF EXISTS "fav_select_own" ON public.favorites;
DROP POLICY IF EXISTS "fav_insert_own" ON public.favorites;
DROP POLICY IF EXISTS "fav_delete_own" ON public.favorites;
CREATE POLICY "fav_select_own" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fav_insert_own" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fav_delete_own" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- BOOK_REVIEWS
DROP POLICY IF EXISTS "reviews_select_all" ON public.book_reviews;
DROP POLICY IF EXISTS "reviews_insert_own" ON public.book_reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON public.book_reviews;
DROP POLICY IF EXISTS "reviews_delete_own" ON public.book_reviews;
CREATE POLICY "reviews_select_all" ON public.book_reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_own" ON public.book_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_update_own" ON public.book_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reviews_delete_own" ON public.book_reviews FOR DELETE USING (auth.uid() = user_id);

-- CONVERSATIONS
DROP POLICY IF EXISTS "conv_select" ON public.conversations;
DROP POLICY IF EXISTS "conv_insert_own" ON public.conversations;
DROP POLICY IF EXISTS "conv_update_admin" ON public.conversations;
CREATE POLICY "conv_select" ON public.conversations FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "conv_insert_own" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conv_update_admin" ON public.conversations FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

-- MESSAGES
DROP POLICY IF EXISTS "msg_select" ON public.messages;
DROP POLICY IF EXISTS "msg_insert" ON public.messages;
DROP POLICY IF EXISTS "msg_update" ON public.messages;
CREATE POLICY "msg_select" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id
    AND (c.user_id = auth.uid() OR has_role(auth.uid(), 'admin')))
);
CREATE POLICY "msg_insert" ON public.messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id
    AND (c.user_id = auth.uid() OR has_role(auth.uid(), 'admin')))
);
CREATE POLICY "msg_update" ON public.messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id
    AND (c.user_id = auth.uid() OR has_role(auth.uid(), 'admin')))
);

-- READING_SESSIONS
DROP POLICY IF EXISTS "rs_select_own" ON public.reading_sessions;
DROP POLICY IF EXISTS "rs_insert_own" ON public.reading_sessions;
DROP POLICY IF EXISTS "rs_update_own" ON public.reading_sessions;
DROP POLICY IF EXISTS "rs_delete_own" ON public.reading_sessions;
CREATE POLICY "rs_select_own" ON public.reading_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rs_insert_own" ON public.reading_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rs_update_own" ON public.reading_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rs_delete_own" ON public.reading_sessions FOR DELETE USING (auth.uid() = user_id);

-- 8. STORAGE BUCKETS ------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES ('book-pdfs', 'book-pdfs', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

-- 9. STORAGE POLICIES -----------------------------------------
DROP POLICY IF EXISTS "storage_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "storage_auth_upload"  ON storage.objects;
DROP POLICY IF EXISTS "storage_auth_update"  ON storage.objects;
DROP POLICY IF EXISTS "storage_auth_delete"  ON storage.objects;
CREATE POLICY "storage_public_read" ON storage.objects FOR SELECT
  USING (bucket_id IN ('book-pdfs','avatars'));
CREATE POLICY "storage_auth_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('book-pdfs','avatars'));
CREATE POLICY "storage_auth_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('book-pdfs','avatars'));
CREATE POLICY "storage_auth_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('book-pdfs','avatars'));

-- ============================================================
-- FIN. Configuration Auth à faire dans Dashboard :
--   Authentication → Providers → Email : Enabled
--   Authentication → URL Configuration : Site URL + Redirects
--   (Optionnel) Désactiver "Confirm email" pour tester rapidement
-- Pour promouvoir votre compte admin après inscription :
--   UPDATE public.user_roles SET role = 'admin'
--   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'votre@email.com');
-- ============================================================
