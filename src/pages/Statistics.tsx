import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, TrendingUp, Clock, Award, AlertCircle } from "lucide-react";

const Statistics = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalUsers: 0,
    activeBorrowings: 0,
    myBorrowings: 0,
    myPublishedBooks: 0,
    overdueBorrowings: 0,
    popularBooks: [] as any[],
  });
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
      
      const adminRole = roles?.some(r => r.role === "admin") ?? false;
      setIsAdmin(adminRole);

      await fetchStatistics(session.user.id, adminRole);
    };

    checkAuth();
  }, [navigate]);

  const fetchStatistics = async (userId: string, isAdminUser: boolean) => {
    // Total books
    const { count: booksCount } = await supabase
      .from("books")
      .select("*", { count: "exact", head: true });

    // Total users
    const { count: usersCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Active borrowings (all if admin, only user's if not)
    const activeBorrowingsQuery = supabase
      .from("borrowings")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    if (!isAdminUser) {
      activeBorrowingsQuery.eq("user_id", userId);
    }

    const { count: activeBorrowingsCount } = await activeBorrowingsQuery;

    // User's borrowings
    const { count: myBorrowingsCount } = await supabase
      .from("borrowings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // User's published books
    const { count: myBooksCount } = await supabase
      .from("books")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", userId);

    // Overdue borrowings
    const today = new Date().toISOString();
    const overdueQuery = supabase
      .from("borrowings")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .lt("due_date", today);

    if (!isAdminUser) {
      overdueQuery.eq("user_id", userId);
    }

    const { count: overdueCount } = await overdueQuery;

    // Most borrowed books
    const { data: borrowingsData } = await supabase
      .from("borrowings")
      .select("book_id, books(title, author, cover_url)")
      .limit(100);

    const bookCounts = borrowingsData?.reduce((acc: any, curr: any) => {
      const bookId = curr.book_id;
      if (!acc[bookId]) {
        acc[bookId] = { count: 0, book: curr.books };
      }
      acc[bookId].count++;
      return acc;
    }, {});

    const popularBooks = Object.values(bookCounts || {})
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5);

    setStats({
      totalBooks: booksCount || 0,
      totalUsers: usersCount || 0,
      activeBorrowings: activeBorrowingsCount || 0,
      myBorrowings: myBorrowingsCount || 0,
      myPublishedBooks: myBooksCount || 0,
      overdueBorrowings: overdueCount || 0,
      popularBooks: popularBooks as any[],
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar user={user} isAdmin={isAdmin} />
      
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Statistiques
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isAdmin && (
            <>
              <Card className="shadow-[var(--shadow-card)]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Livres</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalBooks}</div>
                </CardContent>
              </Card>

              <Card className="shadow-[var(--shadow-card)]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                </CardContent>
              </Card>
            </>
          )}

          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {isAdmin ? "Emprunts actifs (total)" : "Mes emprunts actifs"}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeBorrowings}</div>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mes emprunts (total)</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.myBorrowings}</div>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mes livres publiés</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.myPublishedBooks}</div>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)] border-destructive/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Emprunts en retard</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.overdueBorrowings}</div>
            </CardContent>
          </Card>
        </div>

        {isAdmin && stats.popularBooks.length > 0 && (
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle>Livres les plus empruntés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.popularBooks.map((item: any, index: number) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-12 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
                      {item.book?.cover_url ? (
                        <img
                          src={item.book.cover_url}
                          alt={item.book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.book?.title}</p>
                      <p className="text-sm text-muted-foreground">{item.book?.author}</p>
                    </div>
                    <div className="text-2xl font-bold text-primary">{item.count}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Statistics;