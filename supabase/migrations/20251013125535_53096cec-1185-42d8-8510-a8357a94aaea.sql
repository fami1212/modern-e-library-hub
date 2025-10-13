-- Modifier les policies pour permettre aux utilisateurs de publier des livres
DROP POLICY IF EXISTS "Seuls les admins peuvent créer des livres" ON public.books;

CREATE POLICY "Les utilisateurs authentifiés peuvent créer des livres"
ON public.books
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Créer la table favorites
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Policies pour favorites
CREATE POLICY "Les utilisateurs voient leurs propres favoris"
ON public.favorites
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent ajouter des favoris"
ON public.favorites
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs favoris"
ON public.favorites
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Créer un bucket pour les PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-pdfs', 'book-pdfs', true);

-- Policies pour le bucket book-pdfs
CREATE POLICY "Les PDFs sont accessibles à tous"
ON storage.objects
FOR SELECT
USING (bucket_id = 'book-pdfs');

CREATE POLICY "Les utilisateurs authentifiés peuvent uploader des PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'book-pdfs');

CREATE POLICY "Les admins peuvent supprimer des PDFs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'book-pdfs' AND has_role(auth.uid(), 'admin'::app_role));

-- Ajouter une colonne pdf_url à la table books
ALTER TABLE public.books ADD COLUMN pdf_url TEXT;