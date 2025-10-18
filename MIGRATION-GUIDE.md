# 📘 Guide de Migration vers Supabase Externe

## 🎯 Étape 1: Créer votre projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un compte (ou connectez-vous)
3. Cliquez sur "New Project"
4. Remplissez les informations :
   - **Name**: eLibrary (ou le nom de votre choix)
   - **Database Password**: Choisissez un mot de passe fort
   - **Region**: Choisissez la région la plus proche
   - **Pricing Plan**: Free tier suffit pour commencer
5. Cliquez sur "Create new project" et attendez 2-3 minutes

## 🗄️ Étape 2: Exécuter le script SQL

1. Dans votre projet Supabase, allez dans **SQL Editor** (icône dans le menu latéral)
2. Cliquez sur "New query"
3. Copiez TOUT le contenu du fichier `supabase-migration-export.sql`
4. Collez-le dans l'éditeur SQL
5. Cliquez sur "Run" (ou Ctrl/Cmd + Enter)
6. Vérifiez qu'il n'y a pas d'erreurs (tout doit être vert ✓)

## 🔑 Étape 3: Récupérer vos clés API

1. Dans votre projet Supabase, allez dans **Settings** > **API**
2. Notez ces informations importantes :
   - **Project URL** (commence par https://)
   - **anon public** key (commence par eyJ...)
   - **service_role** key (garde-la secrète!)

## 🔧 Étape 4: Configurer l'authentification

1. Allez dans **Authentication** > **Providers**
2. Activez **Email** provider
3. Allez dans **Authentication** > **URL Configuration**
4. Configurez :
   - **Site URL**: `https://votre-app.lovable.app` (URL de votre app)
   - **Redirect URLs**: Ajoutez votre URL d'application

5. Allez dans **Authentication** > **Settings**
6. **IMPORTANT**: Désactivez "Enable email confirmations" pour faciliter les tests

## 📝 Étape 5: Mettre à jour votre application

Dans Lovable, vous devrez mettre à jour le fichier `.env` avec vos nouvelles clés :

\`\`\`env
VITE_SUPABASE_URL=https://votre-projet-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre-anon-key-ici
\`\`\`

**⚠️ ATTENTION**: Vous ne pouvez pas éditer `.env` directement dans Lovable. 
Vous devrez :
- Soit transférer votre projet vers GitHub et éditer le fichier localement
- Soit me demander de reconfigurer l'application pour utiliser vos clés

## 📦 Étape 6: Recréer le bucket de stockage

Le bucket `book-pdfs` a été créé automatiquement par le script SQL.

Pour vérifier :
1. Allez dans **Storage** dans votre dashboard Supabase
2. Vous devriez voir le bucket `book-pdfs`

## 👤 Étape 7: Créer votre premier utilisateur admin

1. Allez dans **Authentication** > **Users**
2. Cliquez sur "Add user" > "Create new user"
3. Entrez :
   - Email: votre email
   - Password: votre mot de passe
   - Auto Confirm User: ✓ (coché)
4. Cliquez sur "Create user"

5. **Attribuer le rôle admin** via SQL Editor :
\`\`\`sql
-- Remplacez 'votre-email@example.com' par votre vrai email
UPDATE user_roles 
SET role = 'admin'
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'votre-email@example.com'
);
\`\`\`

## 🔄 Étape 8: Migrer les données (optionnel)

Si vous avez déjà des données dans Lovable Cloud que vous voulez conserver :

### Option A: Export/Import manuel
1. Exportez les données depuis l'actuelle base
2. Importez-les dans votre nouvelle base via SQL

### Option B: Je peux vous aider
Dites-moi et je peux créer des scripts SQL pour exporter vos données actuelles.

## ✅ Étape 9: Tester votre migration

1. Connectez-vous avec votre compte admin
2. Testez les fonctionnalités :
   - ✓ Connexion/Déconnexion
   - ✓ Création de livre
   - ✓ Emprunt
   - ✓ Favoris/Wishlist
   - ✓ Messages
   - ✓ Statistiques

## 🎨 Étape 10: Reconfigurer l'application Lovable

Une fois que tout est prêt :
1. **Transférez votre projet vers GitHub** (bouton GitHub en haut à droite)
2. **Clonez le repo localement**
3. **Créez un fichier `.env.local`** avec vos nouvelles clés Supabase
4. **Testez localement** avec `npm run dev`
5. **Déployez** où vous voulez (Vercel, Netlify, etc.)

## ⚠️ Notes importantes

- **Vous perdrez l'intégration Lovable Cloud** : les futures modifications de base de données devront être faites manuellement
- **Les fichiers PDF** : devront être ré-uploadés manuellement dans le nouveau bucket
- **Les images** : devront aussi être ré-uploadées
- **La gestion des migrations** : sera manuelle via le SQL Editor de Supabase

## 🆘 Besoin d'aide ?

Si vous rencontrez des problèmes :
1. Vérifiez les logs d'erreur dans la console
2. Vérifiez que les clés API sont correctes
3. Vérifiez que l'authentification est bien configurée
4. Demandez-moi de l'aide !

## 📚 Resources utiles

- [Documentation Supabase](https://supabase.com/docs)
- [Guide d'authentification](https://supabase.com/docs/guides/auth)
- [Guide de stockage](https://supabase.com/docs/guides/storage)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
