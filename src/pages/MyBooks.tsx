import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload } from "lucide-react";
import { z } from "zod";

const bookSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis").max(200),
  author: z.string().trim().min(1, "L'auteur est requis").max(200),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().max(100).optional(),
});

const MyBooks = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    description: "",
    category: "",
    coverUrl: "",
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    try {
      const validation = bookSchema.safeParse({
        title: formData.title,
        author: formData.author,
        description: formData.description || undefined,
        category: formData.category || undefined,
      });

      if (!validation.success) {
        toast({
          title: "Erreur de validation",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      setUploading(true);

      let pdfUrl = null;
      let coverUrl = formData.coverUrl || null;

      // Upload PDF
      if (pdfFile) {
        const fileName = `${Date.now()}-${pdfFile.name}`;
        const { error: uploadError, data } = await supabase.storage
          .from("book-pdfs")
          .upload(fileName, pdfFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("book-pdfs")
          .getPublicUrl(fileName);

        pdfUrl = publicUrl;
      }

      // Upload cover
      if (coverFile) {
        const fileName = `${Date.now()}-${coverFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("book-pdfs")
          .upload(fileName, coverFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("book-pdfs")
          .getPublicUrl(fileName);

        coverUrl = publicUrl;
      }

      const bookData = {
        title: formData.title.trim(),
        author: formData.author.trim(),
        description: formData.description.trim() || null,
        category: formData.category.trim() || null,
        cover_url: coverUrl,
        pdf_url: pdfUrl,
        total_copies: 1,
        available_copies: 1,
      };

      const { error } = await supabase
        .from("books")
        .insert(bookData);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Livre publié avec succès !",
      });

      setFormData({
        title: "",
        author: "",
        description: "",
        category: "",
        coverUrl: "",
      });
      setPdfFile(null);
      setCoverFile(null);

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} isAdmin={isAdmin} />
      
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Publier un livre
        </h1>

        <Card className="max-w-2xl shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle>Ajouter un nouveau livre</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="author">Auteur *</Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  required
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  maxLength={1000}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  maxLength={100}
                  placeholder="Roman, Science-fiction, Histoire..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverUrl">URL de la couverture</Label>
                <Input
                  id="coverUrl"
                  type="url"
                  value={formData.coverUrl}
                  onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
                  placeholder="https://exemple.com/image.jpg"
                />
                <p className="text-sm text-muted-foreground">Ou uploadez une image ci-dessous</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverFile">Upload de la couverture</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="coverFile"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                  />
                  {coverFile && <span className="text-sm text-muted-foreground">{coverFile.name}</span>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdfFile">Fichier PDF du livre</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="pdfFile"
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  />
                  {pdfFile && <span className="text-sm text-muted-foreground">{pdfFile.name}</span>}
                </div>
              </div>

              <Button type="submit" variant="gradient" disabled={uploading} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                {uploading ? "Publication en cours..." : "Publier le livre"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyBooks;
