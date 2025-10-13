import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BookRecommendationsProps {
  currentBookId: string;
  category?: string;
  author?: string;
}

export const BookRecommendations = ({ currentBookId, category, author }: BookRecommendationsProps) => {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecommendations();
  }, [currentBookId, category, author]);

  const fetchRecommendations = async () => {
    let query = supabase
      .from("books")
      .select("*")
      .neq("id", currentBookId)
      .limit(4);

    // Prioriser les livres de la même catégorie
    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (!error && data) {
      // Si pas assez de livres dans la même catégorie, compléter avec d'autres
      if (data.length < 4) {
        const { data: moreBooks } = await supabase
          .from("books")
          .select("*")
          .neq("id", currentBookId)
          .limit(4 - data.length);

        if (moreBooks) {
          setRecommendations([...data, ...moreBooks]);
        } else {
          setRecommendations(data);
        }
      } else {
        setRecommendations(data);
      }
    }
  };

  if (recommendations.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommandations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {recommendations.map((book) => (
            <button
              key={book.id}
              onClick={() => navigate(`/book/${book.id}`)}
              className="text-left group"
            >
              <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted mb-2">
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                {book.title}
              </h4>
              <p className="text-xs text-muted-foreground">{book.author}</p>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
