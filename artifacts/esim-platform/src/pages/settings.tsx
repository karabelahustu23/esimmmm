import { useGetProfile, useUpdateProfile } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { User, Globe, Moon, Sun, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "@/components/theme-provider";
import { useI18n } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";

export default function Settings() {
  const { data: profile, isLoading, refetch } = useGetProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useI18n();

  const [displayName, setDisplayName] = useState("");
  const [travelFreq, setTravelFreq] = useState("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setTravelFreq(profile.travelFrequency || "");
    }
  }, [profile]);

  const handleSaveProfile = () => {
    updateProfile.mutate({ data: { displayName, travelFrequency: travelFreq } }, {
      onSuccess: () => {
        toast({ title: "Profile updated successfully" });
        refetch();
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences and app settings.</p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> Profile Information
          </CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile?.email || ""} disabled className="bg-secondary/50 cursor-not-allowed" />
                <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input id="name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="travelFreq">Travel Frequency</Label>
                <Select value={travelFreq} onValueChange={setTravelFreq}>
                  <SelectTrigger id="travelFreq">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rarely">Rarely (1-2 times/year)</SelectItem>
                    <SelectItem value="sometimes">Sometimes (3-5 times/year)</SelectItem>
                    <SelectItem value="often">Often (6+ times/year)</SelectItem>
                    <SelectItem value="nomad">Digital Nomad (Full time)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                <Save className="w-4 h-4 mr-2" /> Save Changes
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" /> App Preferences
          </CardTitle>
          <CardDescription>Customize your app experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">Language</Label>
              <p className="text-sm text-muted-foreground">Choose your preferred language</p>
            </div>
            <div className="w-40">
              <Select value={language} onValueChange={(val: any) => setLanguage(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EN">English</SelectItem>
                  <SelectItem value="TR">Türkçe</SelectItem>
                  <SelectItem value="RU">Русский</SelectItem>
                  <SelectItem value="DE">Deutsch</SelectItem>
                  <SelectItem value="FR">Français</SelectItem>
                  <SelectItem value="ES">Español</SelectItem>
                  <SelectItem value="ZH">中文</SelectItem>
                  <SelectItem value="AR">العربية</SelectItem>
                  <SelectItem value="HI">हिन्दी</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div>
              <Label className="text-base font-semibold flex items-center gap-2">
                Dark Mode
              </Label>
              <p className="text-sm text-muted-foreground">Toggle dark mode appearance</p>
            </div>
            <div className="flex items-center gap-2 bg-secondary p-1 rounded-full border border-border">
              <Button 
                variant="ghost" 
                size="icon" 
                className={`w-8 h-8 rounded-full ${theme === 'light' ? 'bg-background shadow-sm' : ''}`}
                onClick={() => setTheme('light')}
              >
                <Sun className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={`w-8 h-8 rounded-full ${theme === 'dark' ? 'bg-background shadow-sm text-primary' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <Moon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}