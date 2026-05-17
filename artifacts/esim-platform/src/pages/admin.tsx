import { useGetAdminStats, useListUsers, useAdjustUserBalance, useGetAdminConfig, useUpdateAdminConfig, useSyncPackages, useGetEsimAccessBalance } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Users, DollarSign, RefreshCw, Settings as SettingsIcon, ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function Admin() {
  const { data: stats, isLoading: isStatsLoading } = useGetAdminStats();
  const { data: users, isLoading: isUsersLoading, refetch: refetchUsers } = useListUsers();
  const { data: config, isLoading: isConfigLoading, refetch: refetchConfig } = useGetAdminConfig();
  const { data: accessBalance } = useGetEsimAccessBalance();
  
  const adjustBalance = useAdjustUserBalance();
  const updateConfig = useUpdateAdminConfig();
  const syncPackages = useSyncPackages();
  const { toast } = useToast();

  const [siteName, setSiteName] = useState("");
  const [markupPercent, setMarkupPercent] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  useEffect(() => {
    if (config) {
      setSiteName(config.siteName || "");
      setMarkupPercent(config.markupPercent?.toString() || "");
      setPrimaryColor(config.primaryColor || "");
    }
  }, [config]);

  const handleSaveConfig = () => {
    updateConfig.mutate({ data: { 
      siteName, 
      markupPercent: parseFloat(markupPercent),
      primaryColor
    }}, {
      onSuccess: () => {
        toast({ title: "Configuration saved" });
        refetchConfig();
      }
    });
  };

  const handleSync = () => {
    syncPackages.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Packages synchronized successfully" });
      }
    });
  };

  const handleAdjustBalance = () => {
    if (!selectedUser || !adjustAmount) return;
    adjustBalance.mutate({ data: { uid: selectedUser.uid, amountUsd: parseFloat(adjustAmount), reason: adjustReason } }, {
      onSuccess: () => {
        toast({ title: "Balance adjusted" });
        setAdjustOpen(false);
        setAdjustAmount("");
        setAdjustReason("");
        refetchUsers();
      }
    });
  };

  const StatCard = ({ title, value, icon: Icon, isLoading }: any) => (
    <Card className="border-border bg-card">
      <CardContent className="p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {isLoading ? <Skeleton className="h-8 w-20 mt-1" /> : <h3 className="text-2xl font-bold">{value}</h3>}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-primary" /> Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Platform overview and management.</p>
        </div>
        {accessBalance && (
          <div className="text-right bg-secondary px-4 py-2 rounded-xl border border-border">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">eSIMAccess Balance</p>
            <p className="font-mono font-bold text-lg text-primary">${accessBalance.balanceUsd.toFixed(2)}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={`$${stats?.totalRevenueUsd?.toFixed(2) || '0.00'}`} icon={DollarSign} isLoading={isStatsLoading} />
        <StatCard title="Total Users" value={stats?.totalUsers || 0} icon={Users} isLoading={isStatsLoading} />
        <StatCard title="Total Orders" value={stats?.totalOrders || 0} icon={DollarSign} isLoading={isStatsLoading} />
        <StatCard title="Active eSIMs" value={stats?.activeEsims || 0} icon={RefreshCw} isLoading={isStatsLoading} />
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="config">Platform Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Registered Users</CardTitle>
              <CardDescription>Manage user accounts and balances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/50">
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isUsersLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={5}><Skeleton className="h-12 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : users?.map((user) => (
                      <TableRow key={user.uid}>
                        <TableCell>
                          <div className="font-medium">{user.displayName}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full ${user.role === 'admin' ? 'bg-primary/20 text-primary font-bold' : 'bg-secondary text-secondary-foreground'}`}>
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(user.createdAt), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="text-right font-mono font-medium">${user.balanceUsd.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => { setSelectedUser(user); setAdjustOpen(true); }}>
                            Adjust Balance
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><SettingsIcon className="w-5 h-5" /> General Settings</CardTitle>
                <CardDescription>Configure platform branding and pricing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isConfigLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="siteName">Site Name</Label>
                      <Input id="siteName" value={siteName} onChange={e => setSiteName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="markup">Markup Percentage (%)</Label>
                      <Input id="markup" type="number" step="0.1" value={markupPercent} onChange={e => setMarkupPercent(e.target.value)} />
                      <p className="text-xs text-muted-foreground">Global markup applied to base package prices.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="color">Primary Color (Hex)</Label>
                      <div className="flex gap-2">
                        <Input id="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
                        <div className="w-10 h-10 rounded border border-border" style={{ backgroundColor: primaryColor }}></div>
                      </div>
                    </div>
                    <Button onClick={handleSaveConfig} disabled={updateConfig.isPending}>Save Configuration</Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><RefreshCw className="w-5 h-5" /> Data Sync</CardTitle>
                <CardDescription>Synchronize catalog with provider</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Packages are synced automatically every day. You can trigger a manual sync here to pull the latest packages and pricing from eSIMAccess.
                </p>
                <Button onClick={handleSync} disabled={syncPackages.isPending} variant="secondary" className="w-full">
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncPackages.isPending ? 'animate-spin' : ''}`} />
                  {syncPackages.isPending ? 'Syncing...' : 'Sync Packages Now'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Balance</DialogTitle>
            <DialogDescription>
              Modify balance for {selectedUser?.email}. Use negative values to deduct.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between p-3 bg-secondary rounded-lg">
              <span className="text-sm font-medium">Current Balance</span>
              <span className="font-mono font-bold">${selectedUser?.balanceUsd?.toFixed(2)}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input id="amount" type="number" step="0.01" placeholder="e.g. 50 or -10" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason / Description</Label>
              <Input id="reason" placeholder="e.g. Manual top-up via bank transfer" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button onClick={handleAdjustBalance} disabled={!adjustAmount || adjustBalance.isPending}>Apply Adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}