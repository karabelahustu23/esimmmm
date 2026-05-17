import { useListTickets, useCreateTicket, useReplyTicket } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { LifeBuoy, MessageSquare, Send, CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth";

export default function Support() {
  const { data: tickets, isLoading, refetch } = useListTickets();
  const createTicket = useCreateTicket();
  const replyTicket = useReplyTicket();
  const { toast } = useToast();
  const { user } = useAuth();

  const [createOpen, setCreateOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState("");

  const handleCreate = () => {
    if (!newSubject || !newMessage) return;
    createTicket.mutate({ data: { subject: newSubject, message: newMessage } }, {
      onSuccess: () => {
        toast({ title: "Ticket created", description: "Our support team will respond shortly." });
        setCreateOpen(false);
        setNewSubject("");
        setNewMessage("");
        refetch();
      }
    });
  };

  const handleReply = () => {
    if (!replyText || !selectedTicket) return;
    replyTicket.mutate({ id: selectedTicket.id, data: { message: replyText } }, {
      onSuccess: () => {
        toast({ title: "Reply sent" });
        setReplyText("");
        refetch();
        // Optimistically update local state for immediate feedback
        setSelectedTicket({
          ...selectedTicket,
          replies: [...(selectedTicket.replies || []), { message: replyText, isAdmin: user?.role === 'admin', createdAt: new Date().toISOString() }]
        });
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Support</h1>
          <p className="text-muted-foreground mt-1">Need help? We're here for you 24/7.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <LifeBuoy className="w-4 h-4 mr-2" /> New Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Your Tickets</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
                </div>
              ) : tickets && tickets.length > 0 ? (
                <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                  {tickets.map(ticket => (
                    <button 
                      key={ticket.id} 
                      className={`w-full text-left p-4 hover:bg-secondary/50 transition-colors ${selectedTicket?.id === ticket.id ? 'bg-secondary/80 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-foreground line-clamp-1 pr-2">{ticket.subject}</span>
                        <Badge variant="outline" className={ticket.status === 'resolved' ? 'bg-green-100 text-green-800 border-transparent dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-100 text-orange-800 border-transparent dark:bg-orange-900/30 dark:text-orange-400'}>
                          {ticket.status === 'resolved' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                          {ticket.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{ticket.message}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {format(new Date(ticket.createdAt), 'MMM dd, yyyy')}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  You have no support tickets.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selectedTicket ? (
            <Card className="border-border bg-card h-full flex flex-col min-h-[600px]">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{selectedTicket.subject}</CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-2">
                      <span>Ticket #{selectedTicket.id.substring(0, 8)}</span>
                      <span>•</span>
                      <span>{format(new Date(selectedTicket.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={selectedTicket.status === 'resolved' ? 'bg-green-100 text-green-800 border-transparent' : 'bg-orange-100 text-orange-800 border-transparent'}>
                    {selectedTicket.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 flex flex-col">
                <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-secondary/10">
                  {/* Original Message */}
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex shrink-0 items-center justify-center text-primary font-bold">
                      {user?.displayName?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="bg-card border border-border rounded-2xl rounded-tl-none p-4 shadow-sm max-w-[85%]">
                      <p className="text-foreground whitespace-pre-wrap">{selectedTicket.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">{format(new Date(selectedTicket.createdAt), 'HH:mm')}</p>
                    </div>
                  </div>

                  {/* Replies */}
                  {selectedTicket.replies?.map((reply: any, i: number) => (
                    <div key={i} className={`flex gap-4 ${reply.isAdmin && user?.role !== 'admin' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-10 h-10 rounded-full flex shrink-0 items-center justify-center font-bold ${reply.isAdmin ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-primary/10 text-primary'}`}>
                        {reply.isAdmin ? 'S' : (user?.displayName?.[0]?.toUpperCase() || 'U')}
                      </div>
                      <div className={`rounded-2xl p-4 shadow-sm max-w-[85%] ${reply.isAdmin && user?.role !== 'admin' ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-tr-none text-right' : 'bg-card border border-border rounded-tl-none'}`}>
                        <p className={`whitespace-pre-wrap ${reply.isAdmin && user?.role !== 'admin' ? 'text-blue-900 dark:text-blue-100' : 'text-foreground'}`}>{reply.message}</p>
                        <p className={`text-xs mt-2 ${reply.isAdmin && user?.role !== 'admin' ? 'text-blue-500/70' : 'text-muted-foreground'}`}>{format(new Date(reply.createdAt), 'HH:mm')}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {selectedTicket.status !== 'resolved' && (
                  <div className="p-4 bg-card border-t border-border mt-auto">
                    <div className="flex gap-2">
                      <Textarea 
                        placeholder="Type your reply here..." 
                        className="resize-none min-h-[60px]"
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleReply();
                          }
                        }}
                      />
                      <Button onClick={handleReply} className="h-auto shrink-0" disabled={!replyText || replyTicket.isPending}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="h-full min-h-[600px] flex flex-col items-center justify-center bg-card border border-border rounded-xl text-center p-8">
              <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6">
                <MessageSquare className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Select a ticket</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">
                Choose a ticket from the list to view the conversation or create a new one to get help.
              </p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Describe your issue and our team will get back to you soon.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" placeholder="e.g. Cannot activate eSIM in Japan" value={newSubject} onChange={e => setNewSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea 
                id="message" 
                placeholder="Please describe your issue in detail..." 
                className="min-h-[120px]"
                value={newMessage} 
                onChange={e => setNewMessage(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newSubject || !newMessage || createTicket.isPending}>Submit Ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}