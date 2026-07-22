import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, BookOpen, Euro } from "lucide-react";

interface Props {
  ownerId: string;
}

export const OwnerBorrowings = ({ ownerId }: Props) => {
  const [borrowings, setBorrowings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBorrowings = async () => {
    setLoading(true);
    // 1) Récupérer les livres du propriétaire
    const { data: myBooks } = await supabase
      .from("books")
      .select("id, title, author")
      .eq("owner_id", ownerId);

    const bookIds = (myBooks || []).map((b) => b.id);
    if (bookIds.length === 0) {
      setBorrowings([]);
      setLoading(false);
      return;
    }

    // 2) Emprunts sur ces livres
    const { data: borrowingsData } = await supabase
      .from("borrowings")
      .select("*")
      .in("book_id", bookIds)
      .order("borrowed_at", { ascending: false });

    if (!borrowingsData) {
      setBorrowings([]);
      setLoading(false);
      return;
    }

    // 3) Enrichir avec profils emprunteurs
    const userIds = borrowingsData.map((b) => b.user_id).filter(Boolean);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    const enriched = borrowingsData.map((b) => ({
      ...b,
      book: myBooks?.find((bk) => bk.id === b.book_id) || null,
      borrower: profiles?.find((p) => p.id === b.user_id) || null,
    }));

    setBorrowings(enriched);
    setLoading(false);
  };

  useEffect(() => {
    if (ownerId) fetchBorrowings();
  }, [ownerId]);

  const handleValidate = async (id: string) => {
    const { error } = await supabase
      .from("borrowings")
      .update({
        admin_validated: true,
        validated_by: ownerId,
        validated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Emprunt validé" });
    fetchBorrowings();
  };

  const handleConfirmReturn = async (b: any) => {
    if (!confirm("Confirmer le retour de ce livre ?")) return;

    let fineAmount = 0;
    const dueDate = new Date(b.due_date);
    const now = new Date();
    if (now > dueDate) {
      const daysLate = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      fineAmount = daysLate * 0.5;
    }

    const { error } = await supabase
      .from("borrowings")
      .update({
        status: "returned",
        returned_at: new Date().toISOString(),
        fine_amount: fineAmount,
      })
      .eq("id", b.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    // Incrémenter les copies dispo
    const { data: book } = await supabase
      .from("books")
      .select("available_copies")
      .eq("id", b.book_id)
      .single();
    if (book) {
      await supabase
        .from("books")
        .update({ available_copies: (book.available_copies || 0) + 1 })
        .eq("id", b.book_id);
    }

    toast({
      title: "Retour confirmé",
      description: fineAmount > 0 ? `Amende : ${fineAmount.toFixed(2)}€` : "Livre retourné",
    });
    fetchBorrowings();
  };

  const handleMarkFinePaid = async (id: string) => {
    const { error } = await supabase
      .from("borrowings")
      .update({ fine_paid: true })
      .eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Amende marquée comme payée" });
    fetchBorrowings();
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle>Emprunts sur mes livres ({borrowings.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Chargement...</p>
        ) : borrowings.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun emprunt sur vos livres pour le moment
          </p>
        ) : (
          <div className="space-y-4">
            {borrowings.map((b) => {
              const overdue = b.status === "active" && new Date(b.due_date) < new Date();
              return (
                <div key={b.id} className="p-4 rounded-lg border space-y-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <h4 className="font-semibold">{b.book?.title || "Livre"}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Emprunté par : {b.borrower?.full_name || b.borrower?.email || "Utilisateur"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Du {new Date(b.borrowed_at).toLocaleDateString()} — retour prévu{" "}
                        {new Date(b.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {b.status === "returned" ? (
                        <Badge variant="secondary">Retourné</Badge>
                      ) : overdue ? (
                        <Badge variant="destructive">En retard</Badge>
                      ) : (
                        <Badge>En cours</Badge>
                      )}
                      {b.admin_validated ? (
                        <Badge variant="outline">Validé</Badge>
                      ) : b.status === "active" ? (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                          À valider
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  {b.fine_amount > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Euro className="w-3 h-3" />
                      <span className={b.fine_paid ? "text-muted-foreground" : "text-red-500"}>
                        Amende : {Number(b.fine_amount).toFixed(2)}€{" "}
                        {b.fine_paid ? "(payée)" : "(non payée)"}
                      </span>
                    </div>
                  )}

                  {overdue && (
                    <div className="flex items-center gap-2 text-sm text-red-500">
                      <AlertCircle className="w-4 h-4" />
                      <span>Retard — 0.50€/jour</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    {!b.admin_validated && b.status === "active" && (
                      <Button size="sm" onClick={() => handleValidate(b.id)}>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Valider l'emprunt
                      </Button>
                    )}
                    {b.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => handleConfirmReturn(b)}>
                        Confirmer le retour
                      </Button>
                    )}
                    {b.fine_amount > 0 && !b.fine_paid && (
                      <Button size="sm" variant="secondary" onClick={() => handleMarkFinePaid(b.id)}>
                        Marquer amende payée
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
