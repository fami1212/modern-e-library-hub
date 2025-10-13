-- Ajouter le champ owner_id aux livres
ALTER TABLE public.books ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Créer un index pour les requêtes par propriétaire
CREATE INDEX idx_books_owner_id ON public.books(owner_id);

-- Mettre à jour les RLS pour que les propriétaires puissent modifier leurs livres
DROP POLICY IF EXISTS "Seuls les admins peuvent modifier des livres" ON public.books;
DROP POLICY IF EXISTS "Seuls les admins peuvent supprimer des livres" ON public.books;

CREATE POLICY "Les admins et propriétaires peuvent modifier des livres"
ON public.books
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  auth.uid() = owner_id
);

CREATE POLICY "Les admins et propriétaires peuvent supprimer des livres"
ON public.books
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  auth.uid() = owner_id
);

-- Ajouter une colonne de statut aux emprunts pour validation admin
ALTER TABLE public.borrowings ADD COLUMN admin_validated BOOLEAN DEFAULT false;
ALTER TABLE public.borrowings ADD COLUMN validated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.borrowings ADD COLUMN validated_at TIMESTAMP WITH TIME ZONE;

-- Ajouter un index pour les emprunts en attente
CREATE INDEX idx_borrowings_validation ON public.borrowings(admin_validated, status);