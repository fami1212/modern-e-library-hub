-- ============================================
-- MIGRATION COMPLÈTE VERS SUPABASE EXTERNE
-- ============================================
-- Ce fichier contient tous les scripts SQL pour recréer votre base de données
-- sur un nouveau projet Supabase

-- ============================================
-- 1. CRÉATION DES ENUMS
-- ============================================

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- ============================================
-- 2. CRÉATION DES TABLES
-- ============================================

-- Table: profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'user'::app_role,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Table: books
CREATE TABLE public.books (
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: borrowings
CREATE TABLE public.borrowings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  book_id UUID NOT NULL,
  borrowed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  returned_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active'::text,
  admin_validated BOOLEAN DEFAULT false,
  validated_by UUID,
  validated_at TIMESTAMP WITH TIME ZONE,
  extension_count INTEGER DEFAULT 0,
  max_extensions INTEGER DEFAULT 2,
  fine_amount NUMERIC DEFAULT 0,
  fine_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: favorites
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  book_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: book_reviews
CREATE TABLE public.book_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nouvelle conversation'::text,
  status TEXT NOT NULL DEFAULT 'open'::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: reading_sessions
CREATE TABLE public.reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  book_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  pages_read INTEGER DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 3. CRÉATION DES FONCTIONS
-- ============================================

-- Fonction: has_role (pour vérifier les rôles)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Fonction: handle_new_user (trigger pour créer profil et rôle)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Créer le profil
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Attribuer le rôle user par défaut
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- ============================================
-- 4. CRÉATION DES TRIGGERS
-- ============================================

-- Trigger: on_auth_user_created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 5. ACTIVATION DE LA ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. CRÉATION DES POLITIQUES RLS
-- ============================================

-- PROFILES
CREATE POLICY "Tout le monde peut voir les profils" 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Les utilisateurs peuvent mettre à jour leur propre profil" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- USER_ROLES
CREATE POLICY "Tout le monde peut voir les rôles" 
  ON public.user_roles FOR SELECT USING (true);

CREATE POLICY "Seuls les admins peuvent gérer les rôles" 
  ON public.user_roles FOR ALL 
  USING (has_role(auth.uid(), 'admin'));

-- BOOKS
CREATE POLICY "Tout le monde peut voir les livres" 
  ON public.books FOR SELECT USING (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent créer des livres" 
  ON public.books FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Les admins et propriétaires peuvent modifier des livres" 
  ON public.books FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'::app_role) OR (auth.uid() = owner_id));

CREATE POLICY "Les admins et propriétaires peuvent supprimer des livres" 
  ON public.books FOR DELETE 
  USING (has_role(auth.uid(), 'admin'::app_role) OR (auth.uid() = owner_id));

-- BORROWINGS
CREATE POLICY "Les utilisateurs voient leurs propres emprunts" 
  ON public.borrowings FOR SELECT 
  USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Les utilisateurs peuvent créer leurs propres emprunts" 
  ON public.borrowings FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les admins peuvent modifier tous les emprunts" 
  ON public.borrowings FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Les admins peuvent supprimer tous les emprunts" 
  ON public.borrowings FOR DELETE 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- FAVORITES
CREATE POLICY "Les utilisateurs voient leurs propres favoris" 
  ON public.favorites FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent ajouter des favoris" 
  ON public.favorites FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs favoris" 
  ON public.favorites FOR DELETE 
  USING (auth.uid() = user_id);

-- BOOK_REVIEWS
CREATE POLICY "Tout le monde peut voir les avis" 
  ON public.book_reviews FOR SELECT USING (true);

CREATE POLICY "Les utilisateurs peuvent créer leurs avis" 
  ON public.book_reviews FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier leurs avis" 
  ON public.book_reviews FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs avis" 
  ON public.book_reviews FOR DELETE 
  USING (auth.uid() = user_id);

-- CONVERSATIONS
CREATE POLICY "Les utilisateurs voient leurs propres conversations" 
  ON public.conversations FOR SELECT 
  USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Les utilisateurs peuvent créer leurs conversations" 
  ON public.conversations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les admins peuvent modifier toutes les conversations" 
  ON public.conversations FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- MESSAGES
CREATE POLICY "Les utilisateurs voient les messages de leurs conversations" 
  ON public.messages FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND ((conversations.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "Les utilisateurs peuvent créer des messages dans leurs convers" 
  ON public.messages FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND ((conversations.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "Les utilisateurs peuvent marquer leurs messages comme lus" 
  ON public.messages FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND ((conversations.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  ));

-- READING_SESSIONS
CREATE POLICY "Users can view their own reading sessions"
  ON public.reading_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reading sessions"
  ON public.reading_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading sessions"
  ON public.reading_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reading sessions"
  ON public.reading_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 7. CRÉATION DU BUCKET DE STOCKAGE
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('book-pdfs', 'book-pdfs', true);

-- Politiques de stockage pour book-pdfs
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-pdfs');

CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'book-pdfs' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'book-pdfs' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'book-pdfs' AND auth.role() = 'authenticated');

-- ============================================
-- 8. CONFIGURATION DE L'AUTHENTIFICATION
-- ============================================
-- À configurer manuellement dans le dashboard Supabase :
-- - Enable Email Provider
-- - Disable Email Confirmations (pour les tests)
-- - Configure Site URL et Redirect URLs
