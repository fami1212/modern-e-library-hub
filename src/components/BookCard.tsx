import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, User, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface BookCardProps {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  availableCopies: number;
  isFavorite?: boolean;
  userId?: string;
  onFavoriteChange?: (isFavorite: boolean) => void;
}

export const BookCard = ({ 
  id, 
  title, 
  author, 
  coverUrl, 
  availableCopies,
  isFavorite = false,
  userId,
  onFavoriteChange
}: BookCardProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId) {
      toast({
        title: "Connexion requise",
        description: "Connectez-vous pour ajouter des favoris",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("book_id", id);

        if (error) throw error;

        onFavoriteChange?.(false);
        toast({
          title: "Retiré des favoris",
        });
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: userId, book_id: id });

        if (error) throw error;

        onFavoriteChange?.(true);
        toast({
          title: "Ajouté aux favoris",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Link to={`/book/${id}`}>
      <Card className="group overflow-hidden hover:shadow-[var(--shadow-elegant)] transition-all duration-300 bg-gradient-to-br from-card to-secondary/20">
        <div className="aspect-[3/4] overflow-hidden bg-muted relative">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
              <BookOpen className="w-16 h-16 text-primary/40" />
            </div>
          )}
          {availableCopies === 0 && (
            <div className="absolute inset-0 bg-destructive/80 flex items-center justify-center">
              <span className="text-white font-semibold text-lg">Indisponible</span>
            </div>
          )}
          <button
            onClick={handleFavoriteClick}
            disabled={loading}
            className="absolute top-2 right-2 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-all z-10"
          >
            <Heart
              className={`w-5 h-5 transition-all ${
                isFavorite ? "fill-primary text-primary" : "text-muted-foreground"
              }`}
            />
          </button>
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg line-clamp-2 text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          <div className="flex items-center gap-2 mt-2 text-muted-foreground">
            <User className="w-4 h-4" />
            <p className="text-sm line-clamp-1">{author}</p>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <span className="text-sm text-muted-foreground">
            {availableCopies} {availableCopies > 1 ? 'exemplaires disponibles' : 'exemplaire disponible'}
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
};
