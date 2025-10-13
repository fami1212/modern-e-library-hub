-- Créer la table des avis/notes sur les livres
CREATE TABLE public.book_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(book_id, user_id)
);

-- Ajouter des index pour les performances
CREATE INDEX idx_book_reviews_book_id ON public.book_reviews(book_id);
CREATE INDEX idx_book_reviews_user_id ON public.book_reviews(user_id);

-- Activer RLS
ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les avis
CREATE POLICY "Tout le monde peut voir les avis" 
ON public.book_reviews 
FOR SELECT 
USING (true);

CREATE POLICY "Les utilisateurs peuvent créer leurs avis" 
ON public.book_reviews 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier leurs avis" 
ON public.book_reviews 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs avis" 
ON public.book_reviews 
FOR DELETE 
USING (auth.uid() = user_id);

-- Ajouter des colonnes pour les prolongations et amendes dans borrowings
ALTER TABLE public.borrowings
ADD COLUMN IF NOT EXISTS extension_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_extensions INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS fine_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fine_paid BOOLEAN DEFAULT false;