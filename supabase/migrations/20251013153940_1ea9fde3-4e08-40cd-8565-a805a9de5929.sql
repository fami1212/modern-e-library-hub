-- Créer la table des conversations/messages
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nouvelle conversation',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les performances
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);

-- Activer RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les conversations
CREATE POLICY "Les utilisateurs voient leurs propres conversations" 
ON public.conversations 
FOR SELECT 
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Les utilisateurs peuvent créer leurs conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les admins peuvent modifier toutes les conversations" 
ON public.conversations 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Politiques RLS pour les messages
CREATE POLICY "Les utilisateurs voient les messages de leurs conversations" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = conversation_id 
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Les utilisateurs peuvent créer des messages dans leurs conversations" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = conversation_id 
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Les utilisateurs peuvent marquer leurs messages comme lus" 
ON public.messages 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = conversation_id 
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);