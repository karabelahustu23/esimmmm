import { useGetReferral } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Share2, Copy, Users, DollarSign, Gift } from "lucide-react";
import { format } from "date-fns";

export default function Referral() {
  const { data: referral, isLoading } = useGetReferral();
  const { toast } = useToast();

  const handleCopy = () => {
    if (referral?.referralCode) {
      navigator.clipboard.writeText(referral.referralCode);
      toast({ title: "Copied!", description: "Referral code copied to clipboard." });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Refer a Friend</h1>
        <p className="text-muted-foreground mt-1">Give $5, get $5. Share the gift of global connectivity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2 border-border bg-gradient-to-br from-primary/10 via-card to-card">
          <CardContent className="p-8 flex flex-col justify-center h-full">
            <div className="mb-6">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground mb-4 shadow-lg shadow-primary/20">
                <Gift className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Share your code</h2>
              <p className="text-muted-foreground max-w-md">
                When a friend signs up with your code and makes their first purchase, you both receive a $5 credit in your wallet.
              </p>
            </div>
            
            <div className="flex items-center gap-4 bg-background p-2 rounded-xl border border-border">
              <div className="flex-1 px-4 py-2 font-mono text-lg font-bold tracking-widest text-center text-primary">
                {isLoading ? <Skeleton className="h-6 w-24 mx-auto" /> : referral?.referralCode}
              </div>
              <Button onClick={handleCopy} className="rounded-lg shadow-sm" disabled={isLoading}>
                <Copy className="w-4 h-4 mr-2" /> Copy Code
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Referrals</p>
                {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : (
                  <h3 className="text-3xl font-bold text-foreground">{referral?.totalReferrals || 0}</h3>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bonus Earned</p>
                {isLoading ? <Skeleton className="h-8 w-24 mt-1" /> : (
                  <h3 className="text-3xl font-bold text-foreground">${referral?.totalBonusEarnedUsd?.toFixed(2) || '0.00'}</h3>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Your Referrals</CardTitle>
          <CardDescription>Friends who joined using your code</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : referral?.referrals && referral.referrals.length > 0 ? (
            <div className="space-y-4">
              {referral.referrals.map((ref, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/20">
                  <div>
                    <p className="font-medium text-foreground">{ref.email}</p>
                    <p className="text-xs text-muted-foreground">Joined {format(new Date(ref.joinedAt), 'MMM dd, yyyy')}</p>
                  </div>
                  <div className="font-bold text-green-600 dark:text-green-400">
                    +${ref.bonusEarnedUsd.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
              You haven't referred anyone yet. Share your code to get started!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}