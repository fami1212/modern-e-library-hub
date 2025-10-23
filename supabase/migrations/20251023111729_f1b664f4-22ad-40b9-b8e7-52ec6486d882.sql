-- 1) Create public avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2) Storage policies for avatars bucket
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3) Backfill profiles for existing users
INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', '')
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- 4) Backfill default user role where missing
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'user'::app_role
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id
);

-- 5) Add essential foreign keys for admin queries
ALTER TABLE public.borrowings
  DROP CONSTRAINT IF EXISTS borrowings_user_id_fkey,
  ADD CONSTRAINT borrowings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.borrowings
  DROP CONSTRAINT IF EXISTS borrowings_book_id_fkey,
  ADD CONSTRAINT borrowings_book_id_fkey
  FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;

ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_user_id_fkey,
  ADD CONSTRAINT conversations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey,
  ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;