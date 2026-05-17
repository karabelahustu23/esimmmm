import { useListFamilyMembers, useCreateFamilyMember, useDeleteFamilyMember } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, UserPlus, MapPin, Clock, Trash2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Family() {
  const { data: members, isLoading, refetch } = useListFamilyMembers();
  const createMember = useCreateFamilyMember();
  const deleteMember = useDeleteFamilyMember();
  const { toast } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState("");

  const handleAdd = () => {
    if (!newName) return;
    createMember.mutate({ data: { name: newName, age: parseInt(newAge) || 0, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newName}` } }, {
      onSuccess: () => {
        toast({ title: "Family member added" });
        setAddOpen(false);
        setNewName("");
        setNewAge("");
        refetch();
      }
    });
  };

  const handleDelete = (id: string) => {
    if(confirm("Are you sure you want to remove this family member?")) {
      deleteMember.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Family member removed" });
          refetch();
        }
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Family & Friends</h1>
          <p className="text-muted-foreground mt-1">Manage eSIMs for your travel companions.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" /> Add Member
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : members && members.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map(member => (
            <Card key={member.id} className="border-border bg-card overflow-hidden hover-elevate group">
              <CardContent className="p-0">
                <div className="p-6 flex flex-col items-center border-b border-border bg-secondary/20 relative">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    onClick={() => handleDelete(member.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Avatar className="w-20 h-20 mb-4 border-4 border-background shadow-sm">
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-bold text-xl text-foreground">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.age > 0 ? `${member.age} years old` : 'Companion'}</p>
                </div>
                <div className="p-6">
                  {member.activeEsim ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span> Active eSIM
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</span>
                        <span className="font-medium">{member.activeEsim.locationName}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Data</span>
                        <span className="font-medium">{member.activeEsim.dataGb} GB</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 space-y-4">
                      <p className="text-sm text-muted-foreground">No active eSIM.</p>
                      <Button variant="outline" className="w-full text-primary border-primary/20 hover:bg-primary/5">
                        <PlusCircle className="w-4 h-4 mr-2" /> Buy eSIM for {member.name}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-4 bg-card border border-dashed border-border rounded-xl text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Travel together</h3>
          <p className="text-muted-foreground max-w-md mt-2 mb-6">
            Add family members or friends to manage their eSIMs and data packages from one account.
          </p>
          <Button onClick={() => setAddOpen(true)} className="rounded-full px-8">
            <UserPlus className="w-4 h-4 mr-2" /> Add First Member
          </Button>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Family Member</DialogTitle>
            <DialogDescription>
              Add a traveler to manage their eSIMs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Jane Doe" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Age (Optional)</Label>
              <Input id="age" type="number" placeholder="25" value={newAge} onChange={e => setNewAge(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newName || createMember.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
