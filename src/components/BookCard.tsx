import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, User } from "lucide-react";
import { Link } from "react-router-dom";

interface BookCardProps {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  availableCopies: number;
}

export const BookCard = ({ id, title, author, coverUrl, availableCopies }: BookCardProps) => {
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
