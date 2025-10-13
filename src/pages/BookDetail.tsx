import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, User, Calendar, Hash, ArrowLeft, FileText } from "lucide-react";
import { BookReviews } from "@/components/BookReviews";
import { BookRecommendations } from "@/components/BookRecommendations";

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchBook = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger le livre",
          variant: "destructive",
        });
        navigate("/");
      } else {
        setBook(data);
      }
    };

    fetchBook();
  }, [id, navigate, toast]);

  const handleBorrow = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (book.available_copies === 0) {
      toast({
        title: "Indisponible",
        description: "Ce livre n'est plus disponible",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const { error: borrowError } = await supabase
        .from("borrowings")
        .insert({
          user_id: user.id,
          book_id: book.id,
          due_date: dueDate.toISOString(),
        });

      if (borrowError) throw borrowError;

      const { error: updateError } = await supabase
        .from("books")
        .update({ available_copies: book.available_copies - 1 })
        .eq("id", book.id);

      if (updateError) throw updateError;

      toast({
        title: "Succès",
        description: "Livre emprunté avec succès ! À retourner avant le " + dueDate.toLocaleDateString(),
      });

      setBook({ ...book, available_copies: book.available_copies - 1 });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'emprunter ce livre",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!book) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} isAdmin={isAdmin} />
        <div className="container mx-auto px-4 py-12">
          <p className="text-center text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar user={user} isAdmin={isAdmin} />
      
      <div className="container mx-auto px-4 py-12">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au catalogue
        </Button>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          <div className="aspect-[3/4] max-h-[500px] rounded-lg overflow-hidden shadow-[var(--shadow-elegant)]">
            {book.cover_url ? (
              <img
                src={book.cover_url}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                <BookOpen className="w-32 h-32 text-primary/40" />
              </div>
            )}
          </div>

          <div className="space-y-4 md:space-y-6">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold mb-2 text-foreground">{book.title}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-5 h-5" />
                <p className="text-lg md:text-xl">{book.author}</p>
              </div>
            </div>

            <Card>
              <CardHeader className="font-semibold">Description</CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {book.description || "Aucune description disponible"}
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              {book.isbn && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Hash className="w-4 h-4" />
                      <span className="text-sm">ISBN</span>
                    </div>
                    <p className="font-semibold">{book.isbn}</p>
                  </CardContent>
                </Card>
              )}
              {book.publication_year && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Publication</span>
                    </div>
                    <p className="font-semibold">{book.publication_year}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {book.pdf_url && (
              <Card>
                <CardContent className="pt-6">
                  <a
                    href={book.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" className="w-full">
                      <FileText className="w-4 h-4 mr-2" />
                      Lire le PDF
                    </Button>
                  </a>
                </CardContent>
              </Card>
            )}

            <Card className="bg-gradient-to-br from-secondary to-secondary/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-muted-foreground">Disponibilité</span>
                  <span className="text-2xl font-bold text-primary">
                    {book.available_copies}/{book.total_copies}
                  </span>
                </div>
                <Button
                  variant="gradient"
                  className="w-full"
                  onClick={handleBorrow}
                  disabled={loading || book.available_copies === 0 || !user}
                >
                  {!user
                    ? "Connectez-vous pour emprunter"
                    : loading
                    ? "Emprunt en cours..."
                    : book.available_copies === 0
                    ? "Indisponible"
                    : "Emprunter ce livre"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 md:mt-12 space-y-8">
          <BookReviews bookId={book.id} userId={user?.id} />
          <BookRecommendations 
            currentBookId={book.id} 
            category={book.category} 
            author={book.author} 
          />
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
