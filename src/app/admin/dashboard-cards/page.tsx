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
  deleteDoc,
  query,
  where,
  QueryDocumentSnapshot,
  writeBatch
} from 'firebase/firestore';
import { useFirestore, useStorage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, ImageIcon, Upload } from 'lucide-react';
import { useAdminOnly } from '@/hooks/useAdminOnly';
import Image from 'next/image';
import { compressImage } from '@/lib/image-utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface DashboardCardImage {
  id: string;
  cardId: string;
  imageUrl: string;
  isActive: boolean;
}

const DASHBOARD_CARDS = [
    { id: 'wallet', name: 'Wallet Balance' },
    { id: 'winnings', name: 'Total Winnings' },
    { id: 'matches', name: 'Matches Played' },
    { id: 'winrate', name: 'Win Rate' },
    { id: 'active_matches', name: 'Active Matches' },
    { id: 'referral', name: 'Referral Fund' },
    { id: 'bonus', name: 'Daily Bonus' },
]

function CardImageManager({ cardId, cardName }: { cardId: string, cardName: string }) {
    useAdminOnly();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();

    const [images, setImages] = useState<DashboardCardImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        if (!firestore) return;
        setLoading(true);
        const q = query(collection(firestore, 'dashboardCardImages'), where('cardId', '==', cardId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(
                (doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as DashboardCardImage)
            );
            setImages(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [firestore, cardId]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file || !firestore || !storage) {
            toast({ title: 'Please select a file.', variant: 'destructive' });
            return;
        }
        setIsUploading(true);

        try {
            const compressedFile = await compressImage(file);
            const storageRef = ref(storage, `dashboard-cards/${cardId}/${Date.now()}-${compressedFile.name}`);
            await uploadBytes(storageRef, compressedFile);
            const imageUrl = await getDownloadURL(storageRef);

            await addDoc(collection(firestore, 'dashboardCardImages'), {
                cardId,
                imageUrl,
                isActive: true, // All new images are active by default
                createdAt: serverTimestamp(),
            });

            toast({ title: 'Image Uploaded!', className: 'bg-green-100 text-green-800' });
            setFile(null);
        } catch (error: any) {
            toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleDelete = async (image: DashboardCardImage) => {
        if (!firestore || !storage) return;

        const { id: docId, imageUrl } = image;

        try {
            // Delete Firestore document
            const docRef = doc(firestore, 'dashboardCardImages', docId);
            await deleteDoc(docRef);
            
            // Delete from Storage
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);

            toast({ title: 'Image Deleted', variant: 'destructive' });
        } catch (error: any) {
            if (error.code === 'storage/object-not-found') {
                 await deleteDoc(doc(firestore, 'dashboardCardImages', docId));
                 toast({ title: 'Image Deleted', variant: 'destructive' });
            } else {
                toast({ title: 'Deletion Failed', description: error.message, variant: 'destructive' });
            }
        }
    };

     const handleToggleActive = async (image: DashboardCardImage) => {
        if (!firestore) return;
        const docRef = doc(firestore, 'dashboardCardImages', image.id);
        try {
            await updateDoc(docRef, { isActive: !image.isActive });
            toast({ title: `Image status updated for ${cardName}`});
        } catch (error: any) {
            toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{cardName}</CardTitle>
                <CardDescription>Recommended size: 400x400px. Upload images for the <span className="font-bold">&quot;{cardName}&quot;</span> card.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {loading && <Loader2 className="animate-spin" />}
                    {images.map(image => (
                        <div key={image.id} className="relative group">
                            <Image src={image.imageUrl} alt={cardName} width={100} height={100} className="w-full h-full object-cover rounded-md aspect-square" />
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                                <Switch checked={image.isActive} onCheckedChange={() => handleToggleActive(image)} aria-label="Toggle active status"/>
                                <Button size="icon" variant="destructive" onClick={() => handleDelete(image)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                            {!image.isActive && <div className="absolute inset-0 bg-white/70 flex items-center justify-center"><Badge variant="secondary">Inactive</Badge></div>}
                        </div>
                    ))}
                 </div>
                 {images.length === 0 && !loading && <p className="text-sm text-muted-foreground text-center py-4">No images uploaded for this card yet.</p>}
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-4">
                <Input type="file" onChange={handleFileChange} accept="image/*" />
                <Button onClick={handleUpload} disabled={isUploading || !file} className="w-full sm:w-auto">
                    {isUploading ? <Loader2 className="animate-spin mr-2"/> : <Upload className="mr-2 h-4 w-4" />}
                    Upload
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function DashboardCardsPage() {
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <ImageIcon className="h-8 w-8 text-primary"/>
                Dashboard Card Images
            </h2>
            <div className="space-y-6">
                {DASHBOARD_CARDS.map(card => (
                    <CardImageManager key={card.id} cardId={card.id} cardName={card.name} />
                ))}
            </div>
        </div>
    );
}
