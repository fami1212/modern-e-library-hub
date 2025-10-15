import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Star } from "lucide-react";

interface BookReviewsProps {
  bookId: string;
  userId: string | undefined;
}

export const BookReviews = ({ bookId, userId }: BookReviewsProps) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [userReview, setUserReview] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (bookId) {
      fetchReviews();
    }
  }, [bookId]);

  const fetchReviews = async () => {
    try {
      console.log("Fetching reviews for book:", bookId);
      const { data, error } = await supabase
        .from("book_reviews")
        .select("*, profiles (full_name, email)")
        .eq("book_id", bookId)
        .order("created_at", { ascending: false });

      console.log("Reviews data:", data, "Error:", error);

      if (error) {
        console.error("Error fetching reviews:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les avis",
          variant: "destructive",
        });
        setReviews([]);
        return;
      }

      setReviews(data || []);
      if (userId && data) {
        const myReview = data.find((r) => r.user_id === userId);
        if (myReview) {
          setUserReview(myReview);
          setRating(myReview.rating);
          setComment(myReview.comment || "");
        }
      }
    } catch (error) {
      console.error("Unexpected error fetching reviews:", error);
      setReviews([]);
    }
  };

  const handleSubmit = async () => {
    if (!userId) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour laisser un avis",
        variant: "destructive",
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une note",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (userReview) {
        const { error } = await supabase
          .from("book_reviews")
          .update({ rating, comment })
          .eq("id", userReview.id);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Votre avis a été mis à jour",
        });
      } else {
        const { error } = await supabase
          .from("book_reviews")
          .insert({ book_id: bookId, user_id: userId, rating, comment });

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Votre avis a été ajouté",
        });
      }

      fetchReviews();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Avis et notes</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{averageRating.toFixed(1)}</span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(averageRating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">({reviews.length} avis)</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userId && (
            <div className="space-y-4 pb-6 border-b mb-6">
              <div>
                <p className="text-sm font-medium mb-2">Votre note</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-6 h-6 cursor-pointer transition-colors ${
                          star <= rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300 hover:text-yellow-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Votre commentaire (optionnel)</p>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Partagez votre avis sur ce livre..."
                  rows={3}
                />
              </div>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {userReview ? "Modifier mon avis" : "Publier mon avis"}
              </Button>
            </div>
          )}

          <div className="space-y-4">
            {reviews.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Aucun avis pour le moment
              </p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">
                        {review.profiles?.full_name || review.profiles?.email || "Utilisateur"}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
