import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { BookCard } from "@/components/BookCard";
import { Heart } from "lucide-react";

const Favorites = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [favoriteBooks, setFavoriteBooks] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      
      setIsAdmin(roles?.some(r => r.role === "admin") ?? false);
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return;

      const { data: favData } = await supabase
        .from("favorites")
        .select("book_id")
        .eq("user_id", user.id);

      if (favData && favData.length > 0) {
        const bookIds = favData.map((fav) => fav.book_id);
        setFavorites(bookIds);

        const { data: booksData } = await supabase
          .from("books")
          .select("*")
          .in("id", bookIds);

        if (booksData) {
          setFavoriteBooks(booksData);
        }
      }
    };

    fetchFavorites();
  }, [user]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} isAdmin={isAdmin} />
      
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="w-8 h-8 fill-primary text-primary" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Mes favoris
          </h1>
        </div>

        {favoriteBooks.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">
              Vous n'avez pas encore de livres favoris
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              Cliquez sur le cœur sur les livres pour les ajouter à vos favoris
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {favoriteBooks.map((book) => (
              <BookCard
                key={book.id}
                id={book.id}
                title={book.title}
                author={book.author}
                coverUrl={book.cover_url}
                availableCopies={book.available_copies}
                isFavorite={true}
                userId={user.id}
                onFavoriteChange={(isFav) => {
                  if (!isFav) {
                    setFavoriteBooks(favoriteBooks.filter((b) => b.id !== book.id));
                    setFavorites(favorites.filter((id) => id !== book.id));
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
