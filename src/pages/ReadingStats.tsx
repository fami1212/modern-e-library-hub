import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { BookOpen, Clock, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const ReadingStats = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalMinutes: 0,
    totalPages: 0,
    recentSessions: [] as any[],
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
      
      setIsAdmin(roles?.some(r => r.role === "admin") ?? false);
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      const { data: sessions } = await supabase
        .from("reading_sessions")
        .select("*, books(title, author, cover_url)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (sessions) {
        const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
        const totalPages = sessions.reduce((sum, s) => sum + (s.pages_read || 0), 0);

        setStats({
          totalSessions: sessions.length,
          totalMinutes,
          totalPages,
          recentSessions: sessions.slice(0, 10),
        });
      }
    };

    fetchStats();
  }, [user]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar user={user} isAdmin={isAdmin} />
      
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Mes statistiques de lecture
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <BookOpen className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Sessions</p>
                <p className="text-2xl font-bold">{stats.totalSessions}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Clock className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Temps total</p>
                <p className="text-2xl font-bold">{Math.floor(stats.totalMinutes / 60)}h {stats.totalMinutes % 60}m</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <BookOpen className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Pages lues</p>
                <p className="text-2xl font-bold">{stats.totalPages}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Sessions récentes</h2>
          {stats.recentSessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucune session de lecture enregistrée
            </p>
          ) : (
            <div className="space-y-4">
              {stats.recentSessions.map((session) => (
                <div key={session.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  {session.books?.cover_url && (
                    <img 
                      src={session.books.cover_url} 
                      alt={session.books.title}
                      className="w-12 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{session.books?.title}</p>
                    <p className="text-sm text-muted-foreground">{session.books?.author}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(session.created_at), "d MMMM yyyy à HH:mm", { locale: fr })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{session.duration_minutes} min</p>
                    <p className="text-xs text-muted-foreground">{session.pages_read} pages</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ReadingStats;
