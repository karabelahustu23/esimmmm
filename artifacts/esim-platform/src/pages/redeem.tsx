import { useRedeemCode, useGenerateRedeemCode, useListRedeemCodes } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Gift, Sparkles, Tag, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth";

export default function Redeem() {
  const [code, setCode] = useState("");
  const redeemCode = useRedeemCode();
  const generateCode = useGenerateRedeemCode();
  const { data: codes, refetch } = useListRedeemCodes();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    
    redeemCode.mutate({ data: { code } }, {
      onSuccess: () => {
        toast({ title: "Success!", description: "Gift card redeemed successfully. Funds added to your wallet." });
        setCode("");
      },
      onError: () => {
        toast({ title: "Invalid Code", description: "This code is invalid or has already been used.", variant: "destructive" });
      }
    });
  };

  const handleGenerate = (amount: number) => {
    generateCode.mutate({ data: { amountUsd: amount } }, {
      onSuccess: () => {
        toast({ title: "Code generated" });
        refetch();
      }
    });
  };

  const handleCopy = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCode(codeText);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Redeem Gift Card</h1>
        <p className="text-muted-foreground mt-1">Got a gift code? Enter it below to add funds to your wallet.</p>
      </div>

      <div className="max-w-2xl">
        <Card className="border-border bg-card shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <CardContent className="p-8 md:p-12 relative z-10">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6">
              <Gift className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Have a gift code?</h2>
            <p className="text-muted-foreground mb-8 max-w-md">
              Enter your alphanumeric gift code to instantly add credits to your wallet for your next eSIM purchase.
            </p>

            <form onSubmit={handleRedeem} className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  placeholder="e.g. GIFT-1234-ABCD" 
                  className="pl-10 h-14 text-lg font-mono tracking-wider uppercase bg-background"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                />
              </div>
              <Button type="submit" className="h-14 px-8 text-lg" disabled={!code || redeemCode.isPending}>
                {redeemCode.isPending ? "Redeeming..." : "Redeem"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {user?.role === "admin" && (
        <div className="space-y-6 pt-8 border-t border-border">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" /> Admin: Manage Codes
            </h2>
            <p className="text-muted-foreground mt-1">Generate new gift codes for users.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Generate New Code</CardTitle>
                <CardDescription>Create a single-use gift code.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {[10, 25, 50].map(amount => (
                    <Button 
                      key={amount} 
                      variant="outline" 
                      className="h-16 text-lg border-primary/20 hover:border-primary hover:bg-primary/5"
                      onClick={() => handleGenerate(amount)}
                      disabled={generateCode.isPending}
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Recent Codes</CardTitle>
                <CardDescription>Recently generated gift codes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {codes?.map(c => (
                    <div key={c.code} className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30">
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold text-primary">{c.code}</code>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(c.code)}>
                            {copiedCode === c.code ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(c.createdAt), 'MMM dd, yyyy')}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-bold">${c.amountUsd}</span>
                        <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className={c.status === 'active' ? 'bg-green-500 hover:bg-green-600 text-white text-[10px]' : 'text-[10px]'}>
                          {c.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {(!codes || codes.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No codes generated yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}