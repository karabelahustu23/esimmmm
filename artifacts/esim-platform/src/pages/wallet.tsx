import { useGetWallet, useListTransactions, useGetUserBadges } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Shield, Gift, PlusCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function Wallet() {
  const { data: wallet, isLoading: isWalletLoading } = useGetWallet();
  const { data: transactions, isLoading: isTransactionsLoading } = useListTransactions();
  const { data: badges, isLoading: isBadgesLoading } = useGetUserBadges();

  const [topupOpen, setTopupOpen] = useState(false);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "topup": return <ArrowDownLeft className="text-green-500 w-5 h-5" />;
      case "bonus": return <Gift className="text-purple-500 w-5 h-5" />;
      case "redeem": return <Gift className="text-purple-500 w-5 h-5" />;
      case "purchase": return <ArrowUpRight className="text-blue-500 w-5 h-5" />;
      default: return <ArrowUpRight className="text-muted-foreground w-5 h-5" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "bronze": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case "silver": return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
      case "gold": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "platinum": return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Wallet & Rewards</h1>
        <p className="text-muted-foreground mt-1">Manage your balance and view your achievements.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2 border-border bg-card">
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <WalletIcon className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available Balance</p>
                {isWalletLoading ? (
                  <Skeleton className="h-10 w-32 mt-2" />
                ) : (
                  <h2 className="text-4xl font-bold mt-1">${wallet?.balanceUsd?.toFixed(2) || '0.00'}</h2>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-center md:items-end space-y-3">
              {isWalletLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <Badge variant="outline" className={`px-3 py-1 text-sm ${getLevelColor(wallet?.level || '')}`}>
                  {wallet?.levelName || 'Standard'} Tier
                </Badge>
              )}
              <Button onClick={() => setTopupOpen(true)} className="rounded-full shadow-sm">
                <PlusCircle className="w-4 h-4 mr-2" /> Top Up Balance
              </Button>
            </div>
          </CardContent>
          {!isWalletLoading && wallet?.nextLevelSpendRequired && (
            <div className="px-6 py-4 bg-secondary/50 border-t border-border flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Spend ${wallet.nextLevelSpendRequired.toFixed(2)} more to reach the next tier.</span>
              <span className="font-medium text-foreground">{wallet.discountPercent}% discount active</span>
            </div>
          )}
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> 
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isBadgesLoading ? (
              <div className="space-y-3 mt-4">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : badges && badges.length > 0 ? (
              <div className="space-y-3 mt-2 max-h-48 overflow-y-auto pr-2">
                {badges.map(badge => (
                  <div key={badge.id} className={`flex items-center gap-3 p-3 rounded-lg border ${badge.earned ? 'bg-primary/5 border-primary/20' : 'bg-secondary/30 border-border opacity-60'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${badge.earned ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {badge.earned ? <CheckCircle2 className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{badge.name}</p>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-muted-foreground text-sm">
                No achievements yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent activity on your account</CardDescription>
        </CardHeader>
        <CardContent>
          {isTransactionsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      {getTransactionIcon(tx.type)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(tx.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                  </div>
                  <div className={`font-bold ${['topup', 'bonus', 'redeem'].includes(tx.type) ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                    {['topup', 'bonus', 'redeem'].includes(tx.type) ? '+' : '-'}${tx.amountUsd.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
              No transactions found.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Top Up Balance</DialogTitle>
            <DialogDescription>
              Add funds to your wallet to easily purchase eSIMs.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {[10, 20, 50, 100].map(amount => (
              <Button key={amount} variant="outline" className="h-16 text-lg border-primary/20 hover:border-primary hover:bg-primary/5">
                ${amount}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTopupOpen(false)}>Cancel</Button>
            <Button onClick={() => setTopupOpen(false)}>Proceed to Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}