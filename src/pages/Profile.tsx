import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Calendar, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { BorrowingExtension } from "@/components/BorrowingExtension";

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [borrowings, setBorrowings] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      
      setIsAdmin(roles?.some(r => r.role === "admin") ?? false);

      const { data: borrowingsData } = await supabase
        .from("borrowings")
        .select(`
          *,
          books (
            title,
            author,
            cover_url
          )
        `)
        .eq("user_id", session.user.id)
        .order("borrowed_at", { ascending: false });

      setBorrowings(borrowingsData || []);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleReturn = async (borrowingId: string, bookId: string) => {
    try {
      // Calculer l'amende si en retard
      const borrowing = borrowings.find((b) => b.id === borrowingId);
      let fineAmount = 0;

      if (borrowing) {
        const dueDate = new Date(borrowing.due_date);
        const today = new Date();
        const daysLate = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysLate > 0) {
          fineAmount = daysLate * 0.5; // 0.50€ par jour de retard
        }
      }

      const { error: updateBorrowingError } = await supabase
        .from("borrowings")
        .update({
          returned_at: new Date().toISOString(),
          status: "returned",
          fine_amount: fineAmount,
        })
        .eq("id", borrowingId);

      if (updateBorrowingError) throw updateBorrowingError;

      const { data: book } = await supabase
        .from("books")
        .select("available_copies")
        .eq("id", bookId)
        .single();

      if (book) {
        const { error: updateBookError } = await supabase
          .from("books")
          .update({ available_copies: book.available_copies + 1 })
          .eq("id", bookId);

        if (updateBookError) throw updateBookError;
      }

      toast({
        title: "Succès",
        description: fineAmount > 0 
          ? `Livre retourné. Amende : ${fineAmount.toFixed(2)}€` 
          : "Livre retourné avec succès",
      });

      setBorrowings(
        borrowings.map((b) =>
          b.id === borrowingId 
            ? { ...b, status: "returned", returned_at: new Date().toISOString(), fine_amount: fineAmount } 
            : b
        )
      );
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de retourner le livre",
        variant: "destructive",
      });
    }
  };

  const fetchBorrowings = async () => {
    if (!user) return;

    const { data: borrowingsData } = await supabase
      .from("borrowings")
      .select(`
        *,
        books (
          title,
          author,
          cover_url
        )
      `)
      .eq("user_id", user.id)
      .order("borrowed_at", { ascending: false });

    setBorrowings(borrowingsData || []);
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} isAdmin={isAdmin} />
        <div className="container mx-auto px-4 py-12">
          <p className="text-center text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  const activeBorrowings = borrowings.filter((b) => b.status === "active");
  const pastBorrowings = borrowings.filter((b) => b.status !== "active");

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} isAdmin={isAdmin} />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8 shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="text-2xl">Mon Profil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Nom</p>
                <p className="text-lg font-semibold">{profile.full_name || "Non renseigné"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-lg font-semibold">{profile.email}</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Emprunts en cours</h2>
              {activeBorrowings.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">Aucun emprunt en cours</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {activeBorrowings.map((borrowing) => (
                    <Card key={borrowing.id} className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          <div className="w-20 h-28 rounded overflow-hidden bg-muted flex-shrink-0">
                            {borrowing.books?.cover_url ? (
                              <img
                                src={borrowing.books.cover_url}
                                alt={borrowing.books.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{borrowing.books?.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">{borrowing.books?.author}</p>
                            <div className="flex items-center gap-2 text-sm mb-2">
                              <Calendar className="w-4 h-4" />
                              <span className={new Date(borrowing.due_date) < new Date() ? "text-red-500 font-medium" : "text-muted-foreground"}>
                                À retourner avant le {new Date(borrowing.due_date).toLocaleDateString()}
                              </span>
                            </div>
                            {new Date(borrowing.due_date) < new Date() && (
                              <div className="flex items-center gap-2 text-sm text-red-500 mb-2">
                                <AlertCircle className="w-4 h-4" />
                                <span>En retard ! Amende : 0.50€/jour</span>
                              </div>
                            )}
                            {!borrowing.admin_validated && (
                              <div className="flex items-center gap-2 text-sm text-yellow-600 mb-2">
                                <AlertCircle className="w-4 h-4" />
                                <span>En attente de validation admin</span>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleReturn(borrowing.id, borrowing.book_id)}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Retourner le livre
                              </Button>
                              {borrowing.admin_validated && (
                                <BorrowingExtension
                                  borrowingId={borrowing.id}
                                  extensionCount={borrowing.extension_count || 0}
                                  maxExtensions={borrowing.max_extensions || 2}
                                  dueDate={borrowing.due_date}
                                  onExtended={fetchBorrowings}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Historique</h2>
              {pastBorrowings.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">Aucun historique</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {pastBorrowings.map((borrowing) => (
                    <Card key={borrowing.id} className="opacity-75">
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          <div className="w-20 h-28 rounded overflow-hidden bg-muted flex-shrink-0">
                            {borrowing.books?.cover_url ? (
                              <img
                                src={borrowing.books.cover_url}
                                alt={borrowing.books.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{borrowing.books?.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">{borrowing.books?.author}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span>Retourné le {new Date(borrowing.returned_at).toLocaleDateString()}</span>
                            </div>
                            {borrowing.fine_amount > 0 && (
                              <div className="flex items-center gap-2 text-sm text-red-500">
                                <AlertCircle className="w-4 h-4" />
                                <span>Amende : {borrowing.fine_amount.toFixed(2)}€ {borrowing.fine_paid ? "(payée)" : "(non payée)"}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
