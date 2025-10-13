import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Trash2, Edit, Plus } from "lucide-react";
import { z } from "zod";

const bookSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis").max(200),
  author: z.string().trim().min(1, "L'auteur est requis").max(200),
  description: z.string().trim().max(1000).optional(),
  isbn: z.string().trim().max(50).optional(),
  publicationYear: z.number().min(1000).max(new Date().getFullYear() + 1).optional(),
  category: z.string().trim().max(100).optional(),
  totalCopies: z.number().min(1, "Au moins 1 exemplaire requis"),
});

const Admin = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [books, setBooks] = useState<any[]>([]);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    description: "",
    coverUrl: "",
    isbn: "",
    publicationYear: "",
    category: "",
    totalCopies: "1",
  });
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
      
      const adminRole = roles?.some(r => r.role === "admin") ?? false;
      setIsAdmin(adminRole);

      if (!adminRole) {
        toast({
          title: "Accès refusé",
          description: "Vous n'avez pas les permissions pour accéder à cette page",
          variant: "destructive",
        });
        navigate("/");
      }
    };

    checkAuth();
  }, [navigate, toast]);

  useEffect(() => {
    const fetchBooks = async () => {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setBooks(data);
      }
    };

    if (isAdmin) {
      fetchBooks();
    }
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validation = bookSchema.safeParse({
        title: formData.title,
        author: formData.author,
        description: formData.description || undefined,
        isbn: formData.isbn || undefined,
        publicationYear: formData.publicationYear ? parseInt(formData.publicationYear) : undefined,
        category: formData.category || undefined,
        totalCopies: parseInt(formData.totalCopies),
      });

      if (!validation.success) {
        toast({
          title: "Erreur de validation",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      const bookData = {
        title: formData.title.trim(),
        author: formData.author.trim(),
        description: formData.description.trim() || null,
        cover_url: formData.coverUrl.trim() || null,
        isbn: formData.isbn.trim() || null,
        publication_year: formData.publicationYear ? parseInt(formData.publicationYear) : null,
        category: formData.category.trim() || null,
        total_copies: parseInt(formData.totalCopies),
        available_copies: editingBook
          ? editingBook.available_copies + (parseInt(formData.totalCopies) - editingBook.total_copies)
          : parseInt(formData.totalCopies),
      };

      if (editingBook) {
        const { error } = await supabase
          .from("books")
          .update(bookData)
          .eq("id", editingBook.id);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Livre modifié avec succès",
        });

        setBooks(books.map((b) => (b.id === editingBook.id ? { ...b, ...bookData } : b)));
      } else {
        const { data, error } = await supabase
          .from("books")
          .insert(bookData)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Livre ajouté avec succès",
        });

        setBooks([data, ...books]);
      }

      setFormData({
        title: "",
        author: "",
        description: "",
        coverUrl: "",
        isbn: "",
        publicationYear: "",
        category: "",
        totalCopies: "1",
      });
      setEditingBook(null);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (book: any) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      description: book.description || "",
      coverUrl: book.cover_url || "",
      isbn: book.isbn || "",
      publicationYear: book.publication_year?.toString() || "",
      category: book.category || "",
      totalCopies: book.total_copies.toString(),
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce livre ?")) return;

    try {
      const { error } = await supabase.from("books").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Livre supprimé avec succès",
      });

      setBooks(books.filter((b) => b.id !== id));
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le livre",
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} isAdmin={isAdmin} />
      
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Panneau d'administration
        </h1>

        <Tabs defaultValue="add" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="add">
              <Plus className="w-4 h-4 mr-2" />
              {editingBook ? "Modifier" : "Ajouter"}
            </TabsTrigger>
            <TabsTrigger value="manage">
              <BookOpen className="w-4 h-4 mr-2" />
              Gérer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add">
            <Card className="max-w-2xl shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle>{editingBook ? "Modifier le livre" : "Ajouter un nouveau livre"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
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

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="isbn">ISBN</Label>
                      <Input
                        id="isbn"
                        value={formData.isbn}
                        onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                        maxLength={50}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="publicationYear">Année de publication</Label>
                      <Input
                        id="publicationYear"
                        type="number"
                        value={formData.publicationYear}
                        onChange={(e) => setFormData({ ...formData, publicationYear: e.target.value })}
                        min="1000"
                        max={new Date().getFullYear() + 1}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Catégorie</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="totalCopies">Nombre d'exemplaires *</Label>
                      <Input
                        id="totalCopies"
                        type="number"
                        value={formData.totalCopies}
                        onChange={(e) => setFormData({ ...formData, totalCopies: e.target.value })}
                        required
                        min="1"
                      />
                    </div>
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
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" variant="gradient">
                      {editingBook ? "Modifier" : "Ajouter"}
                    </Button>
                    {editingBook && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingBook(null);
                          setFormData({
                            title: "",
                            author: "",
                            description: "",
                            coverUrl: "",
                            isbn: "",
                            publicationYear: "",
                            category: "",
                            totalCopies: "1",
                          });
                        }}
                      >
                        Annuler
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage">
            <div className="space-y-4">
              {books.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">Aucun livre dans la bibliothèque</p>
                  </CardContent>
                </Card>
              ) : (
                books.map((book) => (
                  <Card key={book.id}>
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className="w-20 h-28 rounded overflow-hidden bg-muted flex-shrink-0">
                          {book.cover_url ? (
                            <img
                              src={book.cover_url}
                              alt={book.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{book.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{book.author}</p>
                          <p className="text-sm text-muted-foreground">
                            {book.available_copies}/{book.total_copies} exemplaires disponibles
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(book)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(book.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
