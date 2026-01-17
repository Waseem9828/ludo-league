'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, useStorage } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Loader2, PlusCircle, Trash2, Upload, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { useAdminOnly } from '@/hooks/useAdminOnly';
import type { Banner } from '@/lib/types';


export default function BannerManager() {
  useAdminOnly();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState<Record<string, boolean>>({});

  const [file, setFile] = useState<File | null>(null);
  const [targetPage, setTargetPage] = useState('/dashboard');
  const [bannerName, setBannerName] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    if (!firestore) return;
    setLoading(true);
    const q = query(collection(firestore, 'banners'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bannerList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner));
      setBanners(bannerList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [firestore]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      if (!bannerName) {
        setBannerName(e.target.files[0].name.split('.')[0]); // Auto-fill name from filename
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !bannerName || !targetPage || !firestore || !storage) {
      toast({ title: 'Please select a file, name, and target page.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `banners/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);

      await addDoc(collection(firestore, 'banners'), {
        name: bannerName,
        imageUrl: imageUrl,
        targetPage: targetPage,
        isActive: true,
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Banner Uploaded Successfully!', className: 'bg-green-100 text-green-800' });
      setFile(null);
      setBannerName('');
      setTargetPage('/dashboard');
      setIsAddDialogOpen(false);
    } catch (error: any) {
      toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    if (!firestore) return;
    setIsActionLoading(prev => ({...prev, [banner.id]: true}));
    const bannerRef = doc(firestore, 'banners', banner.id);
    try {
      await updateDoc(bannerRef, { isActive: !banner.isActive });
      toast({ title: `Banner status updated.` });
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsActionLoading(prev => ({...prev, [banner.id]: false}));
    }
  };

  const handleDelete = async (banner: Banner) => {
    if (!firestore || !storage) return;
    setIsActionLoading(prev => ({...prev, [banner.id]: true}));
    try {
      // Delete from Firestore
      await deleteDoc(doc(firestore, 'banners', banner.id));
      
      // Delete from Storage
      const imageRef = ref(storage, banner.imageUrl);
      await deleteObject(imageRef);

      toast({ title: 'Banner Deleted', variant: 'destructive' });
    } catch (error: any) {
       // If it fails because the file doesn't exist in storage, that's okay.
      if (error.code === 'storage/object-not-found') {
        console.warn("Firestore entry deleted, but image was not found in Storage. Continuing...");
        toast({ title: 'Banner Deleted', variant: 'destructive' });
      } else {
        toast({ title: 'Failed to delete banner', description: error.message, variant: 'destructive' });
      }
    } finally {
       setIsActionLoading(prev => ({...prev, [banner.id]: false}));
    }
  };


  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
             <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <ImageIcon className="h-8 w-8 text-primary"/>
                Banner Management
            </h2>
             <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2 h-4 w-4"/> Add New Banner</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload New Banner</DialogTitle>
                        <DialogDescription>Upload an image and specify where it should link to.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="banner-name">Banner Name</Label>
                            <Input id="banner-name" value={bannerName} onChange={e => setBannerName(e.target.value)} placeholder="e.g., Diwali Offer"/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="target-page">Target Page</Label>
                            <Select value={targetPage} onValueChange={setTargetPage}>
                                <SelectTrigger id="target-page">
                                    <SelectValue placeholder="Select a page" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="/dashboard">Dashboard</SelectItem>
                                    <SelectItem value="/lobby">Lobby</SelectItem>
                                    <SelectItem value="/tournaments">Tournaments</SelectItem>
                                    <SelectItem value="/leaderboard">Leaderboard</SelectItem>
                                    <SelectItem value="/wallet">Wallet</SelectItem>
                                    <SelectItem value="/referrals">Referrals</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="banner-file">Banner File</Label>
                            <Input id="banner-file" type="file" onChange={handleFileChange} accept="image/*" />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleUpload} disabled={isUploading || !file || !bannerName}>
                             {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                            Upload
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Existing Banners</CardTitle>
            <CardDescription>View, manage, and toggle all available banners.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banner</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Target Page</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary"/></TableCell></TableRow>}
                {!loading && banners.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No banners found.</TableCell></TableRow>}
                {!loading && banners.map(banner => (
                  <TableRow key={banner.id}>
                     <TableCell>
                      <Image src={banner.imageUrl} alt={banner.name} width={128} height={72} className="h-16 w-32 object-cover rounded-md border" />
                    </TableCell>
                     <TableCell className="font-medium">{banner.name}</TableCell>
                     <TableCell>
                        <a href={banner.targetPage} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                            {banner.targetPage} <LinkIcon className="h-3 w-3"/>
                        </a>
                     </TableCell>
                     <TableCell>
                         <Switch 
                            checked={banner.isActive}
                            onCheckedChange={() => handleToggleActive(banner)}
                            disabled={isActionLoading[banner.id]}
                         />
                     </TableCell>
                    <TableCell className="text-right">
                       {isActionLoading[banner.id] ? <Loader2 className="h-5 w-5 animate-spin"/> : <Button size="icon" variant="destructive" onClick={() => handleDelete(banner)}>
                            <Trash2 className="h-4 w-4"/>
                        </Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </div>
  );
}
