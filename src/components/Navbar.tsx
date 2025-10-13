import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, LayoutDashboard, User as UserIcon, Upload, Heart, BarChart3, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "./ThemeToggle";

interface NavbarProps {
  user: any;
  isAdmin: boolean;
}

export const Navbar = ({ user, isAdmin }: NavbarProps) => {
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de se déconnecter",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:block border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                eLibrary
              </span>
            </Link>

            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <Button variant="ghost" asChild>
                    <Link to="/statistics" className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      <span className="hidden sm:inline">Stats</span>
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link to="/my-books" className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      <span className="hidden sm:inline">Publier</span>
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link to="/favorites" className="flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      <span className="hidden sm:inline">Favoris</span>
                    </Link>
                  </Button>
                  {isAdmin && (
                    <Button variant="ghost" asChild>
                      <Link to="/admin" className="flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4" />
                        <span className="hidden sm:inline">Admin</span>
                      </Link>
                    </Button>
                  )}
                  <Button variant="ghost" asChild>
                    <Link to="/profile" className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Profil</span>
                    </Link>
                  </Button>
                  <ThemeToggle />
                  <Button variant="ghost" onClick={handleLogout} className="flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Déconnexion</span>
                  </Button>
                </>
              ) : (
                <Button variant="gradient" asChild>
                  <Link to="/auth">Connexion</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg">
          <div className="flex justify-around items-center py-2 px-2 overflow-x-auto">
            <Link to="/" className="flex flex-col items-center gap-1 min-w-[60px] p-2">
              <Home className="w-5 h-5" />
              <span className="text-xs">Accueil</span>
            </Link>
            <Link to="/my-books" className="flex flex-col items-center gap-1 min-w-[60px] p-2">
              <Upload className="w-5 h-5" />
              <span className="text-xs">Publier</span>
            </Link>
            <Link to="/favorites" className="flex flex-col items-center gap-1 min-w-[60px] p-2">
              <Heart className="w-5 h-5" />
              <span className="text-xs">Favoris</span>
            </Link>
            <Link to="/statistics" className="flex flex-col items-center gap-1 min-w-[60px] p-2">
              <BarChart3 className="w-5 h-5" />
              <span className="text-xs">Stats</span>
            </Link>
            {isAdmin && (
              <Link to="/admin" className="flex flex-col items-center gap-1 min-w-[60px] p-2">
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-xs">Admin</span>
              </Link>
            )}
            <Link to="/profile" className="flex flex-col items-center gap-1 min-w-[60px] p-2">
              <UserIcon className="w-5 h-5" />
              <span className="text-xs">Profil</span>
            </Link>
          </div>
        </nav>
      )}

      {/* Mobile Top Bar */}
      <div className="md:hidden sticky top-0 z-40 bg-card border-b shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              eLibrary
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user && (
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
