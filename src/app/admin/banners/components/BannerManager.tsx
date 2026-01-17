'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  listAll,
  deleteObject,
} from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Upload } from 'lucide-react';
import { firebaseApp } from '@/firebase';

interface Banner {
  name: string;
  url: string;
}

export default function BannerManager() {
  const { toast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const storage = getStorage(firebaseApp);
  const bannersRef = ref(storage, 'banners');

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAll(bannersRef);
      const bannerList = await Promise.all(
        res.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          return { name: itemRef.name, url };
        })
      );
      setBanners(bannerList);
    } catch (error: any) {
      toast({ title: 'Failed to fetch banners', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [bannersRef, toast]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({ title: 'Please select a file to upload', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    const storageRef = ref(storage, `banners/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // You can use this to show upload progress
      },
      (error) => {
        toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
        setIsUploading(false);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then(() => {
          toast({ title: 'Banner uploaded successfully', variant: 'default' });
          setIsUploading(false);
          setFile(null);
          fetchBanners(); // Refresh the banner list
        });
      }
    );
  };

  const handleDelete = async (bannerName: string) => {
    const storageRef = ref(storage, `banners/${bannerName}`);
    try {
      await deleteObject(storageRef);
      toast({ title: 'Banner deleted successfully', variant: 'default' });
      fetchBanners(); // Refresh the banner list
    } catch (error: any) {
      toast({ title: 'Failed to delete banner', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-6 w-6 text-primary" />
              Existing Banners
            </CardTitle>
            <CardDescription>View and manage all banners.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banner</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={2} className="text-center py-8"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary"/></TableCell></TableRow>}
                {!loading && banners.length === 0 && <TableRow><TableCell colSpan={2} className="text-center py-8 text-muted-foreground">No banners found.</TableCell></TableRow>}
                {!loading && banners.map(banner => (
                  <TableRow key={banner.name}>
                    <TableCell>
                      <Image src={banner.url} alt={banner.name} width={128} height={64} className="h-16 w-32 object-contain rounded-md" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="destructive" onClick={() => handleDelete(banner.name)}>
                        <Trash2 className="h-4 w-4"/>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <div>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-6 w-6 text-primary" />
              Upload New Banner
            </CardTitle>
            <CardDescription>Select a file and upload it to the banners folder.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="banner-file">Banner File</Label>
              <Input id="banner-file" type="file" onChange={handleFileChange} accept="image/*" />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleUpload} className="w-full" disabled={isUploading || !file}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
              Upload Banner
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
