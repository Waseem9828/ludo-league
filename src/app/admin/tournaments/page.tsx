
'use client';
import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  doc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trophy, Trash2 } from 'lucide-react';
import type { Tournament } from '@/lib/types';
import { useUser } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import Link from 'next/link';


export default function AdminTournamentsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for creating/editing a tournament
  const [formState, setFormState] = useState<Partial<Tournament>>({
    name: '',
    bannerImageUrl: 'https://picsum.photos/seed/tourney/800/400',
    entryFee: 100,
    totalSlots: 100,
    commissionType: 'percentage',
    commissionValue: 10,
    prizePool: 0,
    rules: 'Standard Ludo rules apply. Admins decision is final.',
    status: 'upcoming',
  });

  useEffect(() => {
    if (!firestore) return;
    setLoading(true);
    const q = query(collection(firestore, 'tournaments'), orderBy('startTime', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Tournament)
      );
      setTournaments(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [firestore]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: name === 'entryFee' || name === 'totalSlots' || name === 'commissionValue' ? Number(value) : value }));
  };

  const handleSelectChange = (name: string, value: string) => {
      setFormState(prev => ({ ...prev, [name]: value}));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) {
        toast({ title: 'You must be logged in.', variant: 'destructive'});
        return;
    }
    setIsSubmitting(true);

    const totalCollected = (formState.entryFee || 0) * (formState.totalSlots || 0);
    let finalPrizePool = 0;
    if (formState.commissionType === 'percentage') {
        finalPrizePool = totalCollected - (totalCollected * (Number(formState.commissionValue) || 0) / 100);
    } else {
        finalPrizePool = totalCollected - (Number(formState.commissionValue) || 0);
    }

    try {
        await addDoc(collection(firestore, 'tournaments'), {
            ...formState,
            filledSlots: 0,
            playerIds: [],
            prizePool: finalPrizePool,
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            startTime: new Date(formState.startTime as any),
            endTime: new Date(formState.endTime as any),
        });
        toast({ title: 'Tournament Created Successfully', variant: 'default', className: 'bg-green-100 text-green-800'});
        // Reset form if needed
    } catch (error: any) {
        toast({ title: 'Failed to create tournament', description: error.message, variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              Existing Tournaments
            </CardTitle>
            <CardDescription>View and manage all tournaments.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>Slots</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary"/></TableCell></TableRow>}
                  {!loading && tournaments.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No tournaments found.</TableCell></TableRow>}
                  {!loading && tournaments.map(t => (
                      <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-semibold whitespace-nowrap"><Link href={`/admin/tournaments/${t.id}`}>{t.name}</Link></TableCell>
                          <TableCell>
                              <Badge className={cn({'bg-yellow-100 text-yellow-800': t.status === 'upcoming', 'bg-red-100 text-red-800': t.status === 'live', 'bg-green-100 text-green-800': t.status === 'completed', 'bg-gray-100 text-gray-800': t.status === 'cancelled'}, "border-transparent")}>{t.status}</Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{t.startTime?.toDate().toLocaleString()}</TableCell>
                          <TableCell>{t.filledSlots}/{t.totalSlots}</TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="destructive" className="h-8 w-8">
                                      <Trash2 className="h-4 w-4"/>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure you want to delete this tournament?</AlertDialogTitle>
                                    <AlertDialogDescription>This action cannot be undone and will permanently delete the tournament.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={async () => {
                                        if (!firestore) return;
                                        await deleteDoc(doc(firestore, 'tournaments', t.id));
                                        toast({ title: 'Tournament Deleted', variant: 'destructive' });
                                      }}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                          </TableCell>
                      </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
             <div className="grid gap-4 md:hidden">
              {loading && <div className="text-center py-8"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary"/></div>}
              {!loading && tournaments.length === 0 && <p className="text-center py-8 text-muted-foreground">No tournaments found.</p>}
              {!loading && tournaments.map(t => (
                  <Card key={t.id} className="p-4">
                     <Link href={`/admin/tournaments/${t.id}`}>
                      <div className="flex justify-between items-start mb-3">
                          <p className="font-bold pr-4">{t.name}</p>
                           <Badge className={cn({'bg-yellow-100 text-yellow-800': t.status === 'upcoming', 'bg-red-100 text-red-800': t.status === 'live', 'bg-green-100 text-green-800': t.status === 'completed', 'bg-gray-100 text-gray-800': t.status === 'cancelled'}, "border-transparent")}>{t.status}</Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span>Starts:</span> <span className="font-medium">{t.startTime?.toDate().toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>Slots:</span> <span className="font-medium">{t.filledSlots}/{t.totalSlots}</span></div>
                      </div>
                      </Link>
                      <div className="flex justify-end mt-4">
                           <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                    <Trash2 className="h-4 w-4 mr-2"/>Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>This action will permanently delete the tournament.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={async () => {
                                      if (!firestore) return;
                                      await deleteDoc(doc(firestore, 'tournaments', t.id));
                                      toast({ title: 'Tournament Deleted', variant: 'destructive' });
                                    }}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                      </div>
                  </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-6 w-6 text-primary" />
              Create New Tournament
            </CardTitle>
            <CardDescription>Fill out the form to launch a new tournament.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
               <div className="space-y-2">
                    <Label htmlFor="name">Tournament Name</Label>
                    <Input id="name" name="name" value={formState.name} onChange={handleInputChange} placeholder="e.g., Weekend Bonanza" required/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input id="startTime" name="startTime" type="datetime-local" onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input id="endTime" name="endTime" type="datetime-local" onChange={handleInputChange} required />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="entryFee">Entry Fee</Label>
                        <Input id="entryFee" name="entryFee" type="number" value={formState.entryFee} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="totalSlots">Total Slots</Label>
                        <Input id="totalSlots" name="totalSlots" type="number" value={formState.totalSlots} onChange={handleInputChange} required/>
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="commissionType">Commission Type</Label>
                        <Select name="commissionType" value={formState.commissionType} onValueChange={(v) => handleSelectChange('commissionType', v)}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                                <SelectItem value="fixed">Fixed (₹)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="commissionValue">Commission Value</Label>
                        <Input id="commissionValue" name="commissionValue" type="number" value={formState.commissionValue} onChange={handleInputChange} required/>
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="rules">Rules</Label>
                    <Textarea id="rules" name="rules" value={formState.rules} onChange={handleInputChange} rows={4} />
                </div>
            </CardContent>
            <CardFooter>
                 <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
                    Create Tournament
                </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
