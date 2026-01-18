
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
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Megaphone } from 'lucide-react';
import type { Announcement } from '@/lib/types';
import { useAdminOnly } from '@/hooks/useAdminOnly';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const AnnouncementItem = ({ announcement, onToggle, onDelete, isProcessing }: { announcement: Announcement, onToggle: (id: string, currentStatus: boolean) => void, onDelete: (id: string) => void, isProcessing: boolean }) => (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
        <p className="text-sm font-medium text-card-foreground">{announcement.text}</p>
        <div className="flex items-center gap-4">
            <Switch
                checked={announcement.isActive}
                onCheckedChange={() => onToggle(announcement.id, announcement.isActive)}
                disabled={isProcessing}
            />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onDelete(announcement.id)} disabled={isProcessing}>
                <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
        </div>
    </div>
);


export default function AnnouncementsPage() {
  useAdminOnly();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAnnouncementText, setNewAnnouncementText] = useState('');

  useEffect(() => {
    if (!firestore) return;
    setLoading(true);
    const q = query(collection(firestore, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(
        (doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as Announcement)
      );
      setAnnouncements(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [firestore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !newAnnouncementText.trim()) {
      toast({ title: 'Announcement text cannot be empty.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);

    try {
      await addDoc(collection(firestore, 'announcements'), {
        text: newAnnouncementText,
        isActive: true,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Announcement Created Successfully', className: 'bg-green-100 text-green-800' });
      setNewAnnouncementText('');
    } catch (error: any) {
      toast({ title: 'Failed to create announcement', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(firestore, 'announcements', id));
      toast({ title: 'Announcement Deleted', variant: 'destructive' });
    } catch (error: any) {
      toast({ title: 'Failed to delete item', description: error.message, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleToggle = async (id: string, currentStatus: boolean) => {
    if(!firestore) return;
    setIsSubmitting(true);
    try {
      const docRef = doc(firestore, 'announcements', id);
      await updateDoc(docRef, { isActive: !currentStatus });
      toast({ title: "Status updated!" });
    } catch(error: any) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                <Megaphone className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                Promotion Announcements
            </h2>
        </div>
        <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
            <div className="lg:col-span-1">
                <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    <PlusCircle className="h-6 w-6 text-primary" />
                    Create Announcement
                    </CardTitle>
                    <CardDescription>Add a new promotional text to the banner.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="text">Announcement Text</Label>
                        <Input id="text" name="text" value={newAnnouncementText} onChange={(e) => setNewAnnouncementText(e.target.value)} placeholder="e.g., Special bonus today!" required/>
                    </div>
                    </CardContent>
                    <CardFooter>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
                        Add Announcement
                    </Button>
                    </CardFooter>
                </form>
                </Card>
            </div>

            <div className="lg:col-span-2">
                <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    Existing Announcements
                    </CardTitle>
                    <CardDescription>View, toggle, or delete current announcements.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading && <div className="text-center py-8"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary"/></div>}
                    {!loading && announcements.length === 0 && <div className="text-center py-8 text-muted-foreground">No announcements found.</div>}
                    {!loading && <div className="space-y-4">
                        {announcements.map(item => (
                            <AnnouncementItem key={item.id} announcement={item} onToggle={handleToggle} onDelete={handleDelete} isProcessing={isSubmitting} />
                        ))}
                    </div>}
                </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
