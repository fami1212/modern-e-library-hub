import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Component that checks for upcoming due dates and shows toast reminders.
 * Mount it once in a layout or profile page.
 */
export const DueDateReminder = ({ userId }: { userId: string }) => {
  const { toast } = useToast();

  useEffect(() => {
    const checkDueDates = async () => {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const { data: borrowings } = await supabase
        .from("borrowings")
        .select("id, due_date, book_id, books(title)")
        .eq("user_id", userId)
        .eq("status", "active")
        .lte("due_date", threeDaysFromNow.toISOString());

      if (!borrowings || borrowings.length === 0) return;

      const now = new Date();
      borrowings.forEach((b: any) => {
        const dueDate = new Date(b.due_date);
        const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const bookTitle = b.books?.title || "un livre";

        if (daysLeft < 0) {
          toast({
            title: "⚠️ Emprunt en retard !",
            description: `"${bookTitle}" devait être retourné il y a ${Math.abs(daysLeft)} jour(s). Amende : 0.50€/jour.`,
            variant: "destructive",
          });
        } else if (daysLeft <= 3) {
          toast({
            title: "📚 Rappel de retour",
            description: `"${bookTitle}" doit être retourné dans ${daysLeft} jour(s) (${dueDate.toLocaleDateString()}).`,
          });
        }
      });
    };

    // Small delay so the page renders first
    const timer = setTimeout(checkDueDates, 1500);
    return () => clearTimeout(timer);
  }, [userId, toast]);

  return null;
};
