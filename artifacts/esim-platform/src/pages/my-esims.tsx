import { useListOrders, useCheckEsimStatus } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { QrCode, Download, RefreshCw, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function MyEsims() {
  const { data: orders, isLoading, refetch } = useListOrders();
  const checkStatus = useCheckEsimStatus();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  useEffect(() => {
    // Check status on mount if we have pending orders (or just in general to be safe)
    checkStatus.mutate(undefined, {
      onSuccess: () => refetch()
    });
  }, []);

  const activeOrders = orders?.filter(o => o.status === "active") || [];
  const pendingOrders = orders?.filter(o => o.status === "pending") || [];
  const expiredOrders = orders?.filter(o => o.status === "expired" || o.status === "error") || [];

  const OrderCard = ({ order }: { order: any }) => (
    <Card className="border-border bg-card hover-elevate">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-lg">{order.packageName}</h3>
            <p className="text-sm text-muted-foreground">{order.locationName}</p>
          </div>
          <Badge variant={order.status === "active" ? "default" : order.status === "pending" ? "secondary" : "outline"} className={
            order.status === "active" ? "bg-green-500 hover:bg-green-600 text-white" : 
            order.status === "pending" ? "bg-orange-500 hover:bg-orange-600 text-white" : ""
          }>
            {order.status.toUpperCase()}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <span className="text-muted-foreground block">Data</span>
            <span className="font-medium">{order.dataGb} GB</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Duration</span>
            <span className="font-medium">{order.durationDays} Days</span>
          </div>
          {order.activateTime && (
            <div className="col-span-2">
              <span className="text-muted-foreground block">Expires</span>
              <span className="font-medium">{order.expiredTime ? format(new Date(order.expiredTime), 'MMM dd, yyyy') : 'N/A'}</span>
            </div>
          )}
        </div>

        {order.qrCodeUrl && (
          <Button variant="outline" className="w-full" onClick={() => setSelectedOrder(order)}>
            <QrCode className="w-4 h-4 mr-2" />
            Show QR Code
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My eSIMs</h1>
        <p className="text-muted-foreground mt-1">Manage your active data plans and view history.</p>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="active">Active ({activeOrders.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingOrders.length})</TabsTrigger>
          <TabsTrigger value="history">History ({expiredOrders.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          {isLoading ? <LoadingCards /> : activeOrders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeOrders.map(o => <OrderCard key={o.id} order={o} />)}
            </div>
          ) : <EmptyState title="No active eSIMs" description="You don't have any active eSIMs right now." />}
        </TabsContent>
        
        <TabsContent value="pending" className="space-y-4">
          <div className="flex justify-end mb-2">
            <Button variant="outline" size="sm" onClick={() => checkStatus.mutate(undefined, { onSuccess: () => refetch() })} disabled={checkStatus.isPending}>
              <RefreshCw className={`w-4 h-4 mr-2 ${checkStatus.isPending ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
          </div>
          {isLoading ? <LoadingCards /> : pendingOrders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingOrders.map(o => <OrderCard key={o.id} order={o} />)}
            </div>
          ) : <EmptyState title="No pending eSIMs" description="Any processing orders will appear here." />}
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          {isLoading ? <LoadingCards /> : expiredOrders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {expiredOrders.map(o => <OrderCard key={o.id} order={o} />)}
            </div>
          ) : <EmptyState title="No history" description="Your expired or error orders will appear here." />}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle>Install eSIM</DialogTitle>
            <DialogDescription>
              Scan this QR code with the device where you want to install the eSIM.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            {selectedOrder?.qrCodeUrl ? (
              <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                <img src={selectedOrder.qrCodeUrl} alt="eSIM QR Code" className="w-48 h-48" />
              </div>
            ) : (
              <div className="w-48 h-48 bg-muted rounded-xl flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            
            <div className="w-full space-y-2 text-left bg-secondary p-4 rounded-lg">
              <p className="text-sm"><span className="text-muted-foreground">Location:</span> {selectedOrder?.locationName}</p>
              <p className="text-sm"><span className="text-muted-foreground">ICCID:</span> {selectedOrder?.iccid || 'Pending'}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={() => window.open(selectedOrder?.qrCodeUrl, '_blank')}>
            <Download className="w-4 h-4 mr-2" />
            Download QR Code
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoadingCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
    </div>
  );
}

function EmptyState({ title, description }: { title: string, description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 bg-card border border-border rounded-xl text-center">
      <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
        <Smartphone className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-muted-foreground max-w-sm mt-1">{description}</p>
    </div>
  );
}