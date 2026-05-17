import { useListCountries, useListPackages, useCreateOrder } from "@workspace/api-client-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, MapPin, Wifi, Clock, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Home() {
  const { data: countries, isLoading: isCountriesLoading } = useListCountries();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: packages, isLoading: isPackagesLoading } = useListPackages(
    { locationCode: selectedCountry || undefined },
    { query: { enabled: !!selectedCountry } }
  );

  const filteredCountries = countries?.filter(c => 
    c.locationName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Where to next?</h1>
          <p className="text-lg text-muted-foreground mt-2">Find the best local data plans for your destination.</p>
        </div>
        {!selectedCountry && (
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search countries..." 
              className="pl-9 h-12 bg-card border-border"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {!selectedCountry ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {isCountriesLoading ? (
            Array.from({ length: 15 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))
          ) : (
            filteredCountries?.map((country) => (
              <Card 
                key={country.locationCode} 
                className="cursor-pointer hover:border-primary/50 transition-all hover-elevate border-border bg-card group"
                onClick={() => setSelectedCountry(country.locationCode)}
              >
                <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3 h-full">
                  <span className="text-4xl group-hover:scale-110 transition-transform">{country.flagEmoji}</span>
                  <div>
                    <h3 className="font-semibold text-foreground line-clamp-1">{country.locationName}</h3>
                    <p className="text-xs text-muted-foreground mt-1">From ${country.minPriceUsd.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          {filteredCountries?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No countries found matching "{searchQuery}"
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => setSelectedCountry(null)} className="mb-4 -ml-4 text-muted-foreground">
            ← Back to all countries
          </Button>
          
          <div className="flex items-center gap-4 mb-6">
            <span className="text-5xl">{countries?.find(c => c.locationCode === selectedCountry)?.flagEmoji}</span>
            <h2 className="text-3xl font-bold">{countries?.find(c => c.locationCode === selectedCountry)?.locationName}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isPackagesLoading ? (
               Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))
            ) : (
              packages?.map((pkg) => (
                <PackageCard key={pkg.packageCode} pkg={pkg} />
              ))
            )}
            {packages?.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-xl border border-border">
                No packages available for this destination.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PackageCard({ pkg }: { pkg: any }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const createOrder = useCreateOrder();
  const { toast } = useToast();

  const handlePurchase = () => {
    createOrder.mutate({ data: { packageCode: pkg.packageCode, familyMemberId: null } }, {
      onSuccess: () => {
        toast({ title: "Purchase successful!", description: "Your eSIM is ready." });
        setShowConfirm(false);
      },
      onError: () => {
        toast({ title: "Purchase failed", description: "Please check your wallet balance.", variant: "destructive" });
      }
    });
  };

  return (
    <>
      <Card className="border-border bg-card overflow-hidden flex flex-col hover-elevate">
        <div className="bg-primary/5 p-4 border-b border-border flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg text-foreground">{pkg.name}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" /> {pkg.locationName}
            </p>
          </div>
          <span className="text-2xl">{pkg.flagEmoji}</span>
        </div>
        <CardContent className="p-6 flex-1 flex flex-col justify-between">
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data</p>
                <p className="font-semibold text-lg">{pkg.dataGb} GB</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Validity</p>
                <p className="font-semibold text-lg">{pkg.durationDays} Days</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
            <div className="text-2xl font-bold text-foreground">
              ${pkg.priceUsd.toFixed(2)}
            </div>
            <Button onClick={() => setShowConfirm(true)} className="rounded-full px-6">
              Buy Now
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              You are about to purchase {pkg.dataGb}GB of data for {pkg.locationName}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-between items-center bg-secondary p-4 rounded-lg">
              <span className="font-medium text-foreground">Total Price</span>
              <span className="text-xl font-bold text-primary">${pkg.priceUsd.toFixed(2)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button onClick={handlePurchase} disabled={createOrder.isPending}>
              {createOrder.isPending ? "Processing..." : "Confirm & Pay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}