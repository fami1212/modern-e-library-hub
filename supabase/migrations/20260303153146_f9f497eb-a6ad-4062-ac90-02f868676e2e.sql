CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs propres emprunts"
ON public.borrowings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);