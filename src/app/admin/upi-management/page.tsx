
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import {
  collection,
  onSnapshot,
  doc,
  writeBatch,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  AtSign,
  PlusCircle,
  Trash2,
  Edit,
  QrCode,
  AlertTriangle,
} from 'lucide-react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { useToast } from '@/hooks/use-toast';
import { useAdminOnly } from '@/hooks/useAdminOnly';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription as AlertDescriptionComponent } from '@/components/ui/alert';


interface UpiData {
  id: string;
  upiId: string;
  isActive: boolean;
  paymentLimit: number;
  currentReceived: number;
}

const UpiCard = ({ upi, onSetActive, onDelete, onEdit, isSaving }: { upi: UpiData, onSetActive: (id: string) => void, onDelete: (id: string) => void, onEdit: (upi: UpiData) => void, isSaving: boolean }) => (
  <div className={`p-4 border rounded-lg ${ upi.isActive ? 'text-primary-foreground bg-gradient-to-r from-primary to-primary/80 shadow-lg' : 'bg-card' }`}>
    <div className="flex justify-between items-start gap-4">
      <span className="font-mono text-sm break-all pr-2">{upi.upiId}</span>
      <Switch
        checked={upi.isActive}
        onCheckedChange={() => onSetActive(upi.id)}
        disabled={isSaving || upi.isActive}
        aria-label="Set active UPI"
      />
    </div>
     <div className="mt-4 space-y-2">
        <div className="text-xs opacity-80">
            Limit: ₹{(upi.currentReceived || 0).toLocaleString()} / ₹{(upi.paymentLimit || 0).toLocaleString()}
        </div>
        <Progress value={((upi.currentReceived || 0) / (upi.paymentLimit || 1)) * 100} indicatorClassName={upi.isActive ? 'bg-white' : 'bg-primary'} className={upi.isActive ? 'bg-white/30' : 'bg-secondary'}/>
    </div>
    <div className="mt-4 flex items-center justify-end space-x-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant={upi.isActive ? 'secondary' : 'ghost'} size="sm" className={upi.isActive ? '' : 'text-muted-foreground'}><QrCode className="h-5 w-5 mr-1" /> QR</Button>
        </DialogTrigger>
        <DialogContent className="max-w-xs">
            <DialogHeader>
                <DialogTitle>UPI QR Code</DialogTitle>
                <DialogDescription>Scan to pay with any UPI app.</DialogDescription>
            </DialogHeader>
            <div className="p-4 flex flex-col items-center justify-center">
                <QRCode value={`upi://pay?pa=${upi.upiId}`} size={200} />
                <p className="mt-4 font-mono text-sm">{upi.upiId}</p>
            </div>
        </DialogContent>
      </Dialog>
      <Button variant={upi.isActive ? 'secondary' : 'ghost'} size="icon" onClick={() => onEdit(upi)} className={upi.isActive ? '' : 'text-muted-foreground'}><Edit className="h-4 w-4" /></Button>
      <AlertDialog>
        <AlertDialogTrigger asChild><Button variant="destructive" size="icon" disabled={upi.isActive}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the UPI ID <span className="font-bold">`{upi.upiId}`</span>.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(upi.id)}>Continue</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </div>
);

function AddUpiDialog({ onAdd, isSaving }: { onAdd: (id: string, limit: number) => void, isSaving: boolean }) {
    const [upiId, setUpiId] = useState('');
    const [limit, setLimit] = useState(50000);
    const [open, setOpen] = useState(false);

    const handleAdd = () => {
        onAdd(upiId, limit);
        if(!isSaving) { 
            setUpiId('');
            setLimit(50000);
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> Add New UPI</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
                <DialogTitle>Add New UPI ID</DialogTitle>
                <DialogDescription>Enter the new UPI ID and its payment limit.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className='space-y-2'><Label htmlFor="new-upi">UPI ID</Label><Input id="new-upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="e.g., yourbusiness@okhdfcbank"/></div>
              <div className='space-y-2'><Label htmlFor="new-limit">Payment Limit (₹)</Label><Input id="new-limit" type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value))}/></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleAdd} disabled={isSaving}>{isSaving && (<Loader2 className="mr-2 h-4 w-4 animate-spin" />)}Add UPI</Button></DialogFooter>
          </DialogContent>
        </Dialog>
    );
}

function EditUpiDialog({ editingUpi, setEditingUpi, onUpdate, isSaving }: { editingUpi: UpiData | null, setEditingUpi: (upi: UpiData | null) => void, onUpdate: () => void, isSaving: boolean }) {
     if (!editingUpi) return null;

     return (
        <Dialog open={!!editingUpi} onOpenChange={(isOpen) => !isOpen && setEditingUpi(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit UPI ID</DialogTitle>
                    <DialogDescription>Update the details for this UPI ID.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className='space-y-2'><Label htmlFor="edit-upi">UPI ID</Label><Input id="edit-upi" value={editingUpi?.upiId || ''} onChange={(e) => setEditingUpi({ ...editingUpi, upiId: e.target.value })}/></div>
                    <div className='space-y-2'><Label htmlFor="edit-limit">Payment Limit (₹)</Label><Input id="edit-limit" type="number" value={editingUpi?.paymentLimit || 0} onChange={(e) => setEditingUpi({ ...editingUpi, paymentLimit: Number(e.target.value) })}/></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setEditingUpi(null)}>Cancel</Button><Button onClick={onUpdate} disabled={isSaving}>{isSaving && (<Loader2 className="mr-2 h-4 w-4 animate-spin" />)}Save Changes</Button></DialogFooter>
            </DialogContent>
        </Dialog>
     )
}


export default function UpiManagementPage() {
  useAdminOnly();
  const db = useFirestore();
  const [upiIds, setUpiIds] = useState<UpiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingUpi, setEditingUpi] = useState<UpiData | null>(null);
  const { toast } = useToast();

  const fetchUpiIds = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    const upiCollectionRef = collection(db, 'upiConfiguration');
    const unsubscribe = onSnapshot(upiCollectionRef, (snapshot) => {
      const ids = snapshot.docs
        .filter(doc => doc.id !== 'active')
        .map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                upiId: data.upiId || '',
                isActive: data.isActive || false,
                paymentLimit: data.paymentLimit || 0,
                currentReceived: data.currentReceived || 0,
            } as UpiData
        });
      setUpiIds(ids.sort((a, b) => (a.isActive ? -1 : 1)));
      setLoading(false);
    }, (error) => {
        console.error("Error fetching UPI IDs:", error);
        toast({ title: "Failed to load UPIs", variant: "destructive"});
        setLoading(false);
    });
    return unsubscribe;
  }, [db, toast]);

  useEffect(() => {
    const unsubPromise = fetchUpiIds();
    return () => {
      unsubPromise.then((unsub) => unsub && unsub());
    };
  }, [fetchUpiIds]);

  const handleSetActive = async (idToActivate: string) => {
    if (!db) return;
    setIsSaving(true);
    const batch = writeBatch(db);
    const upiToActivate = upiIds.find((upi) => upi.id === idToActivate);
    
    if (upiToActivate && upiToActivate.upiId) {
      const activeUpiConfigRef = doc(db, 'upiConfiguration', 'active');
      batch.set(activeUpiConfigRef, { activeUpiId: upiToActivate.upiId, activeUpiRef: upiToActivate.id, updatedAt: serverTimestamp() });
      upiIds.forEach((upi) => {
        const docRef = doc(db, 'upiConfiguration', upi.id);
        batch.update(docRef, { isActive: upi.id === idToActivate });
      });

      try {
        await batch.commit();
        toast({ title: 'Success', description: 'Active UPI ID has been updated.', className: 'bg-green-100 text-green-800' });
      } catch (error) {
        console.error('Error setting active UPI ID:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to set the active UPI ID.' });
      } finally {
        setIsSaving(false);
      }
    } else {
        console.error('Attempted to activate a UPI configuration with a missing upiId field:', upiToActivate);
        toast({
            variant: 'destructive',
            title: 'Data Inconsistency Error',
            description: 'The selected UPI configuration is missing a UPI ID. Please delete and re-add it.',
        });
        setIsSaving(false);
    }
  };

  const handleAddUpi = async (upiId: string, limit: number) => {
    if (!db) return;
    if (!upiId.trim() || limit <= 0) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'UPI ID and a valid limit are required.' });
      return;
    }
    setIsSaving(true);
    try {
      const isActive = upiIds.length === 0;
      const newUpiRef = doc(collection(db, 'upiConfiguration'));
      await setDoc(newUpiRef, { upiId: upiId.trim(), isActive, paymentLimit: limit, currentReceived: 0 });

      if (isActive) {
        const activeUpiConfigRef = doc(db, 'upiConfiguration', 'active');
        await setDoc(activeUpiConfigRef, { activeUpiId: upiId.trim(), activeUpiRef: newUpiRef.id, updatedAt: serverTimestamp() });
      }

      toast({ title: 'Success', description: 'New UPI ID added successfully.', className: 'bg-green-100 text-green-800' });
    } catch (error) {
      console.error('Error adding new UPI ID:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add new UPI ID.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateUpi = async () => {
    if (!db || !editingUpi) return;
    if (!editingUpi.upiId.trim() || editingUpi.paymentLimit <= 0) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'UPI ID and a valid limit are required.' });
      return;
    }
    setIsSaving(true);
    const docRef = doc(db, 'upiConfiguration', editingUpi.id);
    try {
      await updateDoc(docRef, { upiId: editingUpi.upiId, paymentLimit: editingUpi.paymentLimit });
      if (editingUpi.isActive) {
        const activeUpiConfigRef = doc(db, 'upiConfiguration', 'active');
        await updateDoc(activeUpiConfigRef, { activeUpiId: editingUpi.upiId, updatedAt: serverTimestamp() });
      }
      toast({ title: 'Success', description: 'UPI ID updated successfully.', className: 'bg-green-100 text-green-800' });
      setEditingUpi(null);
    } catch (error) {
      console.error('Error updating UPI ID:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update UPI ID.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUpi = async (id: string) => {
    if (!db) return;
    const upiToDelete = upiIds.find((u) => u.id === id);
    if (upiToDelete?.isActive) {
      toast({ variant: 'destructive', title: 'Action Not Allowed', description: 'Cannot delete the active UPI ID.' });
      return;
    }
    setIsSaving(true);
    try {
      await deleteDoc(doc(db, 'upiConfiguration', id));
      toast({ title: 'Success', description: 'UPI ID deleted successfully.', variant: 'destructive' });
    } catch (error) {
      console.error('Error deleting UPI ID:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete UPI ID.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <AtSign className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            UPI Management
            </h2>
            <AddUpiDialog onAdd={handleAddUpi} isSaving={isSaving} />
        </div>

        {!loading && upiIds.filter((u) => u.isActive).length !== 1 && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Configuration Error!</AlertTitle>
                <AlertDescriptionComponent>
                    There is no single active UPI ID. Deposits may fail. Please activate one UPI ID from the list below.
                </AlertDescriptionComponent>
            </Alert>
        )}

        <Card>
            <CardHeader>
                <CardTitle>Manage Deposit UPI IDs</CardTitle>
                <CardDescription>Set payment limits and manage the list of UPI IDs for deposits. Only one can be active at a time.</CardDescription>
            </CardHeader>
            <CardContent>
            {loading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : upiIds.length === 0 ? (
                <div className="text-center py-8"><h3 className="text-lg font-semibold">No UPI IDs Found</h3><p className="text-sm text-muted-foreground">Click &quot;Add New UPI&quot; to get started.</p></div>
            ) : (
                <>
                <div className="md:hidden space-y-4">{upiIds.map((upi) => (<UpiCard key={upi.id} upi={upi} onSetActive={handleSetActive} onDelete={handleDeleteUpi} onEdit={() => setEditingUpi({ ...upi })} isSaving={isSaving} />))}</div>
                <div className="hidden md:block overflow-x-auto">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>UPI ID</TableHead>
                        <TableHead>Limit Usage</TableHead>
                        <TableHead className="text-center">QR</TableHead>
                        <TableHead className="text-center">Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {upiIds.map((upi) => (
                        <TableRow key={upi.id} className={upi.isActive ? 'bg-primary/10' : ''}>
                            <TableCell className="font-medium max-w-xs truncate">{upi.upiId}</TableCell>
                            <TableCell>
                                <div className='flex flex-col gap-1 w-48'>
                                    <Progress value={(((upi.currentReceived || 0) / (upi.paymentLimit || 1)) * 100)} />
                                    <span className='text-xs text-muted-foreground'>₹{(upi.currentReceived || 0).toLocaleString()} / ₹{(upi.paymentLimit || 0).toLocaleString()}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-center">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="sm"><QrCode className="h-5 w-5" /></Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-xs">
                                        <DialogHeader>
                                            <DialogTitle>UPI QR Code</DialogTitle>
                                            <DialogDescription>Scan to pay with any UPI app.</DialogDescription>
                                        </DialogHeader>
                                        <div className="p-4 flex flex-col items-center justify-center">
                                            <QRCode value={`upi://pay?pa=${upi.upiId}`} size={200} />
                                            <p className="mt-4 font-mono text-sm">{upi.upiId}</p>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </TableCell>
                            <TableCell className="text-center"><Switch checked={upi.isActive} onCheckedChange={() => handleSetActive(upi.id)} disabled={isSaving || upi.isActive} aria-label="Set active UPI"/></TableCell>
                            <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => setEditingUpi({ ...upi })}><Edit className="h-4 w-4" /></Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="destructive" size="icon" disabled={upi.isActive}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the UPI ID <span className="font-bold">`{upi.upiId}`</span>.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteUpi(upi.id)}>Continue</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </div>
                </>
            )}
            </CardContent>
        </Card>

        <EditUpiDialog editingUpi={editingUpi} setEditingUpi={setEditingUpi} onUpdate={handleUpdateUpi} isSaving={isSaving} />
    </div>
  );
}
