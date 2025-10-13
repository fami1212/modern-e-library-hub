import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { BookCard } from "@/components/BookCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-library.jpg";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [books, setBooks] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        
        setIsAdmin(roles?.some(r => r.role === "admin") ?? false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .then(({ data: roles }) => {
            setIsAdmin(roles?.some(r => r.role === "admin") ?? false);
          });
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchBooks = async () => {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setBooks(data);
        
        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(data.map((book: any) => book.category).filter(Boolean))
        ) as string[];
        setCategories(uniqueCategories);
      }
    };

    fetchBooks();
  }, []);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("favorites")
        .select("book_id")
        .eq("user_id", user.id);

      if (data) {
        setFavorites(data.map((fav) => fav.book_id));
      }
    };

    fetchFavorites();
  }, [user]);

  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory =
      selectedCategory === "all" || book.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} isAdmin={isAdmin} />

      {/* Hero Section */}
      <div className="relative h-[400px] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Library Hero"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
        </div>
        <div className="relative container mx-auto px-4 h-full flex items-center">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Bienvenue dans votre bibliothèque numérique
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              Découvrez, empruntez et gérez votre collection de livres en toute simplicité
            </p>
            {!user && (
              <button
                onClick={() => navigate("/auth")}
                className="px-8 py-3 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-semibold hover:opacity-90 shadow-[var(--shadow-elegant)] transition-all"
              >
                Commencer maintenant
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search and Books */}
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              type="text"
              placeholder="Rechercher un livre ou un auteur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === "all"
                    ? "bg-gradient-to-r from-primary to-accent text-white shadow-[var(--shadow-elegant)]"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                Toutes
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? "bg-gradient-to-r from-primary to-accent text-white shadow-[var(--shadow-elegant)]"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>

        {filteredBooks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">Aucun livre disponible pour le moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                id={book.id}
                title={book.title}
                author={book.author}
                coverUrl={book.cover_url}
                availableCopies={book.available_copies}
                isFavorite={favorites.includes(book.id)}
                userId={user?.id}
                onFavoriteChange={(isFav) => {
                  if (isFav) {
                    setFavorites([...favorites, book.id]);
                  } else {
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

export default Index;
