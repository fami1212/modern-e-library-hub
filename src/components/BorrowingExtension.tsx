import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clock } from "lucide-react";

interface BorrowingExtensionProps {
  borrowingId: string;
  extensionCount: number;
  maxExtensions: number;
  dueDate: string;
  onExtended: () => void;
}

export const BorrowingExtension = ({
  borrowingId,
  extensionCount,
  maxExtensions,
  dueDate,
  onExtended,
}: BorrowingExtensionProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleExtend = async () => {
    if (extensionCount >= maxExtensions) {
      toast({
        title: "Limite atteinte",
        description: `Vous avez déjà utilisé toutes vos prolongations (${maxExtensions})`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const newDueDate = new Date(dueDate);
      newDueDate.setDate(newDueDate.getDate() + 7); // Prolongation de 7 jours

      const { error } = await supabase
        .from("borrowings")
        .update({
          due_date: newDueDate.toISOString(),
          extension_count: extensionCount + 1,
        })
        .eq("id", borrowingId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Emprunt prolongé jusqu'au ${newDueDate.toLocaleDateString()}`,
      });

      onExtended();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canExtend = extensionCount < maxExtensions;

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleExtend}
        disabled={!canExtend || isLoading}
      >
        <Clock className="w-4 h-4 mr-2" />
        Prolonger ({extensionCount}/{maxExtensions})
      </Button>
    </div>
  );
};
