
DROP POLICY IF EXISTS "borrow_select" ON public.borrowings;
DROP POLICY IF EXISTS "borrow_update_self_or_admin" ON public.borrowings;

CREATE POLICY "borrow_select" ON public.borrowings FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.books b WHERE b.id = borrowings.book_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "borrow_update_self_or_admin" ON public.borrowings FOR UPDATE
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.books b WHERE b.id = borrowings.book_id AND b.owner_id = auth.uid())
  );
