import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { useState } from "react";
import { Globe2, Loader2 } from "lucide-react";

export default function Login() {
  const { login, loginError } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isPending) return;
    setIsPending(true);
    try {
      await login(email);
      setLocation("/");
    } catch {
      // loginError is set inside auth context
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-secondary/30 rounded-full blur-3xl pointer-events-none"></div>

      <div className="z-10 flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/25">
          <Globe2 className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground text-center">eSIM Platform</h1>
        <p className="text-muted-foreground mt-2 text-center max-w-sm">Global connectivity without borders.</p>
      </div>

      <Card className="w-full max-w-md z-10 shadow-xl border-border/50 backdrop-blur-sm bg-card/90">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Enter your email to sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="traveler@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isPending}
                className="h-12 bg-background"
              />
            </div>

            {loginError && (
              <p className="text-sm text-destructive text-center">{loginError}</p>
            )}

            <Button type="submit" className="w-full h-12 text-lg mt-2" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-6">
              Your access level is determined by your account role.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
