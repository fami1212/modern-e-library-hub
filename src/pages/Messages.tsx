import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageSquare } from "lucide-react";

const Messages = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
        
        setIsAdmin(roles?.some(r => r.role === "admin") ?? false);
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
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (selectedConversation) {
      // Persist selection for refresh
      localStorage.setItem("lastConvId", selectedConversation.id);
      fetchMessages(selectedConversation.id);
      
      // Subscribe to new messages
      const channel = supabase
        .channel(`messages:${selectedConversation.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${selectedConversation.id}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      let query = supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });

      if (!isAdmin && user?.id) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching conversations:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les conversations",
          variant: "destructive",
        });
        return;
      }

      // For les admins, hydrater les profils des utilisateurs liés aux conversations
      let enrichedData = data || [];
      if (isAdmin && enrichedData.length > 0) {
        const userIds = Array.from(new Set(enrichedData.map((c: any) => c.user_id).filter(Boolean)));
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", userIds);
          if (!profilesError) {
            const profilesById: Record<string, any> = Object.fromEntries(
              (profilesData || []).map((p: any) => [p.id, p])
            );
            enrichedData = enrichedData.map((c: any) => ({
              ...c,
              profiles: profilesById[c.user_id] || null,
            }));
          }
        }
      }

      setConversations(enrichedData);
      // Auto-select last opened or first conversation for persistence
      const lastConvId = localStorage.getItem("lastConvId");
      const toSelect = enrichedData.find((c: any) => c.id === lastConvId) || enrichedData[0] || null;
      if (toSelect) setSelectedConversation(toSelect);
    } catch (error) {
      console.error("Unexpected error fetching conversations:", error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les messages",
          variant: "destructive",
        });
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error("Unexpected error fetching messages:", error);
    }
  };

  const createConversation = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: "Support" })
      .select()
      .single();

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setConversations([data, ...conversations]);
      setSelectedConversation(data);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setLoading(true);

    const { error } = await supabase
      .from("messages")
      .insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        content: newMessage,
      });

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setNewMessage("");
      
      // Update conversation's updated_at
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedConversation.id);
      
      fetchConversations();
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar user={user} isAdmin={isAdmin} />
      
      <div className="container mx-auto px-4 py-6 md:py-12">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Messages
        </h1>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Conversations List */}
          <Card className="md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Conversations</CardTitle>
              {!isAdmin && (
                <Button size="sm" onClick={createConversation}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Nouveau
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune conversation
                </p>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedConversation?.id === conv.id
                        ? "bg-primary/10 border-2 border-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    <p className="font-medium text-sm">{conv.title}</p>
                    {isAdmin && conv.profiles && (
                      <p className="text-xs text-muted-foreground">
                        {conv.profiles.full_name || conv.profiles.email}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(conv.updated_at).toLocaleDateString()}
                    </p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Messages */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedConversation ? selectedConversation.title : "Sélectionnez une conversation"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedConversation ? (
                <div className="space-y-4">
                  <div className="h-[400px] overflow-y-auto space-y-3 p-4 bg-muted/20 rounded-lg">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.sender_id === user?.id ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            msg.sender_id === user?.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-card"
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="flex gap-2">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Écrivez votre message..."
                      className="flex-1"
                      rows={2}
                    />
                    <Button onClick={sendMessage} disabled={loading || !newMessage.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Sélectionnez ou créez une conversation pour commencer
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Messages;
