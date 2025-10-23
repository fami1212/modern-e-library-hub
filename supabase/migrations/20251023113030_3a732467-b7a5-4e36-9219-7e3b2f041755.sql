-- 1) Assurer les clés primaires (au cas où elles manqueraient)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.profiles'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.books'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.books ADD CONSTRAINT books_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.borrowings'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.borrowings ADD CONSTRAINT borrowings_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.conversations'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.conversations ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.messages'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.favorites'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.favorites ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.book_reviews'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.book_reviews ADD CONSTRAINT book_reviews_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.reading_sessions'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.reading_sessions ADD CONSTRAINT reading_sessions_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.user_roles'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- 2) Ajouter les clés étrangères nécessaires pour l'embed PostgREST (si manquantes)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_borrowings_user'
  ) THEN
    ALTER TABLE public.borrowings
      ADD CONSTRAINT fk_borrowings_user
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_borrowings_book'
  ) THEN
    ALTER TABLE public.borrowings
      ADD CONSTRAINT fk_borrowings_book
      FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_conversations_user'
  ) THEN
    ALTER TABLE public.conversations
      ADD CONSTRAINT fk_conversations_user
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_messages_conversation'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT fk_messages_conversation
      FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_messages_sender'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT fk_messages_sender
      FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_favorites_user'
  ) THEN
    ALTER TABLE public.favorites
      ADD CONSTRAINT fk_favorites_user
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_favorites_book'
  ) THEN
    ALTER TABLE public.favorites
      ADD CONSTRAINT fk_favorites_book
      FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_book_reviews_user'
  ) THEN
    ALTER TABLE public.book_reviews
      ADD CONSTRAINT fk_book_reviews_user
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_book_reviews_book'
  ) THEN
    ALTER TABLE public.book_reviews
      ADD CONSTRAINT fk_book_reviews_book
      FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_reading_sessions_user'
  ) THEN
    ALTER TABLE public.reading_sessions
      ADD CONSTRAINT fk_reading_sessions_user
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_reading_sessions_book'
  ) THEN
    ALTER TABLE public.reading_sessions
      ADD CONSTRAINT fk_reading_sessions_book
      FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Pour permettre l'embed profiles.user_roles(...)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_roles_user_profiles'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT fk_user_roles_user_profiles
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3) Index sur colonnes FK (si manquants)
CREATE INDEX IF NOT EXISTS idx_borrowings_user_id ON public.borrowings(user_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_book_id ON public.borrowings(book_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_book_id ON public.favorites(book_id);
CREATE INDEX IF NOT EXISTS idx_book_reviews_user_id ON public.book_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_book_reviews_book_id ON public.book_reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_id ON public.reading_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_book_id ON public.reading_sessions(book_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- 4) Backfill des profils et rôles manquants
INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', '')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- garantir l'unicité (user_id, role)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_role_key'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_role_key UNIQUE (user_id, role);
  END IF;
END $$;

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'user'::public.app_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'user'
WHERE ur.user_id IS NULL;

-- 5) Créer le trigger d'auto-création de profil à l'inscription (si absent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();