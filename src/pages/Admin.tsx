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
import { BookOpen, Trash2, Edit, Plus, Users, Library, Download, MessageSquare } from "lucide-react";
import { exportToCSV, exportToPDF } from "@/utils/exportUtils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const [borrowings, setBorrowings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
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
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          await supabase.auth.signOut();
          navigate("/auth");
          return;
        }

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
            description: "Vous n'avez pas les permissions administrateur",
            variant: "destructive",
          });
          navigate("/");
        }
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/auth");
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
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

  useEffect(() => {
    const fetchBorrowings = async () => {
      console.log("Fetching borrowings...");
      const { data, error } = await supabase
        .from("borrowings")
        .select(`
          *,
          books (title, author),
          profiles (email, full_name)
        `)
        .order("borrowed_at", { ascending: false });

      if (error) {
        console.error("Error fetching borrowings:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les emprunts",
          variant: "destructive",
        });
      } else {
        console.log("Borrowings fetched successfully:", data);
        setBorrowings(data || []);
      }
    };

    const fetchUsers = async () => {
      console.log("Fetching users...");
      const { data, error } = await supabase
        .from("profiles")
        .select("*, user_roles (id, role)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching users:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les utilisateurs",
          variant: "destructive",
        });
      } else {
        console.log("Users fetched successfully:", data);
        setUsers(data || []);
      }
    };

    if (isAdmin) {
      fetchBorrowings();
      fetchUsers();
      fetchConversations();
    }
  }, [isAdmin, toast]);

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select("*, profiles (full_name, email)")
      .order("updated_at", { ascending: false });

    console.log("Conversations fetched:", data, "Error:", error);

    if (!error && data) {
      setConversations(data);
    } else if (error) {
      console.error("Error fetching conversations:", error);
    }
  };

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

  const handleToggleAdmin = async (userId: string, currentRoles: any[]) => {
    const isCurrentlyAdmin = currentRoles.some(r => r.role === "admin");

    try {
      if (isCurrentlyAdmin) {
        const adminRole = currentRoles.find(r => r.role === "admin");
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("id", adminRole.id);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Rôle admin retiré",
        });
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Rôle admin accordé",
        });
      }

      const { data } = await supabase
        .from("profiles")
        .select("*, user_roles (role, id)")
        .order("created_at", { ascending: false });

      if (data) setUsers(data);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleValidateBorrowing = async (borrowingId: string) => {
    try {
      const { error } = await supabase
        .from("borrowings")
        .update({
          admin_validated: true,
          validated_by: user?.id,
          validated_at: new Date().toISOString(),
        })
        .eq("id", borrowingId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Emprunt validé",
      });

      const { data } = await supabase
        .from("borrowings")
        .select(`
          *,
          books (title, author),
          profiles (email, full_name)
        `)
        .order("borrowed_at", { ascending: false });

      if (data) setBorrowings(data);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExportBorrowings = () => {
    const exportData = borrowings.map((b) => ({
      Livre: b.books?.title || "N/A",
      Auteur: b.books?.author || "N/A",
      Utilisateur: b.profiles?.full_name || b.profiles?.email || "N/A",
      "Date d'emprunt": new Date(b.borrowed_at).toLocaleDateString(),
      "Date de retour prévue": new Date(b.due_date).toLocaleDateString(),
      Statut: b.status === "active" ? "En cours" : "Retourné",
      Validé: b.admin_validated ? "Oui" : "Non",
      "Amende (€)": b.fine_amount || 0,
    }));

    exportToCSV(exportData, "emprunts");
  };

  const handleExportUsers = () => {
    const exportData = users.map((u) => ({
      Nom: u.full_name || "Non renseigné",
      Email: u.email,
      Rôles: u.user_roles?.map((r: any) => r.role).join(", ") || "user",
      "Date d'inscription": new Date(u.created_at).toLocaleDateString(),
    }));

    exportToCSV(exportData, "utilisateurs");
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar user={user} isAdmin={isAdmin} />
      
      <div className="container mx-auto px-4 py-6 md:py-12">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Panneau d'administration
        </h1>

        <Tabs defaultValue="add" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 max-w-5xl">
            <TabsTrigger value="add" className="text-xs md:text-sm">
              <Plus className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">{editingBook ? "Modifier" : "Ajouter"}</span>
              <span className="sm:hidden">{editingBook ? "Édit" : "Add"}</span>
            </TabsTrigger>
            <TabsTrigger value="manage" className="text-xs md:text-sm">
              <Library className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Livres</span>
            </TabsTrigger>
            <TabsTrigger value="borrowings" className="text-xs md:text-sm">
              <BookOpen className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Emprunts</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs md:text-sm">
              <Users className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Utilisateurs</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-xs md:text-sm">
              <MessageSquare className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Messages</span>
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

          <TabsContent value="borrowings">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Gestion des emprunts</CardTitle>
                <Button variant="outline" size="sm" onClick={handleExportBorrowings}>
                  <Download className="w-4 h-4 mr-2" />
                  Exporter CSV
                </Button>
              </CardHeader>
              <CardContent>
                {borrowings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucun emprunt</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                      <TableRow>
                        <TableHead>Livre</TableHead>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Date d'emprunt</TableHead>
                        <TableHead>Date de retour prévue</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Validation</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {borrowings.map((borrowing: any) => (
                        <TableRow key={borrowing.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{borrowing.books?.title}</p>
                              <p className="text-sm text-muted-foreground">{borrowing.books?.author}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{borrowing.profiles?.full_name || "N/A"}</p>
                              <p className="text-sm text-muted-foreground">{borrowing.profiles?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{new Date(borrowing.borrowed_at).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(borrowing.due_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                borrowing.status === "active"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-secondary text-secondary-foreground"
                              }`}
                            >
                              {borrowing.status === "active" ? "En cours" : "Retourné"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {borrowing.admin_validated ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                Validé
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                En attente
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {!borrowing.admin_validated && borrowing.status === "active" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleValidateBorrowing(borrowing.id)}
                              >
                                Valider
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des conversations ({conversations.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {conversations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucune conversation</p>
                ) : (
                  <div className="space-y-4">
                    {conversations.map((conv) => (
                      <Card key={conv.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{conv.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {conv.profiles?.full_name || conv.profiles?.email}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Dernière mise à jour: {new Date(conv.updated_at).toLocaleString()}
                              </p>
                              <span
                                className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${
                                  conv.status === "open"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {conv.status === "open" ? "Ouvert" : "Fermé"}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/messages`)}
                              >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Voir
                              </Button>
                              <Button
                                variant={conv.status === "open" ? "outline" : "default"}
                                size="sm"
                                onClick={async () => {
                                  const { error } = await supabase
                                    .from("conversations")
                                    .update({ status: conv.status === "open" ? "closed" : "open" })
                                    .eq("id", conv.id);

                                  if (!error) {
                                    fetchConversations();
                                    toast({
                                      title: "Succès",
                                      description: `Conversation ${conv.status === "open" ? "fermée" : "ouverte"}`,
                                    });
                                  }
                                }}
                              >
                                {conv.status === "open" ? "Fermer" : "Ouvrir"}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Gestion des utilisateurs ({users.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={handleExportUsers}>
                  <Download className="w-4 h-4 mr-2" />
                  Exporter CSV
                </Button>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucun utilisateur</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rôles</TableHead>
                        <TableHead>Date d'inscription</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user: any) => {
                        const isAdmin = user.user_roles?.some((r: any) => r.role === "admin");
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {user.full_name || <span className="text-muted-foreground italic">Non renseigné</span>}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {user.user_roles?.map((r: any) => (
                                  <span
                                    key={r.role}
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      r.role === "admin"
                                        ? "bg-primary/20 text-primary"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {r.role}
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(user.created_at).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant={isAdmin ? "destructive" : "outline"}
                                size="sm"
                                onClick={() => handleToggleAdmin(user.id, user.user_roles || [])}
                              >
                                {isAdmin ? "Retirer admin" : "Promouvoir admin"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
