'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUser, useFirestore, storage } from '@/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from 'lucide-react';
import { compressImage } from '@/lib/image-utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';

const profileSchema = z.object({
  displayName: z.string().min(3, "Display name must be at least 3 characters long."),
  photo: z.any().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function EditProfilePage() {
  const { user, userProfile, loading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      displayName: userProfile?.displayName || '',
      photo: null,
    },
  });
  
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file) {
        form.setValue('photo', e.target.files);
        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarPreview(reader.result as string);
        }
        reader.readAsDataURL(file);
      }
  }

  const onSubmit = async (data: ProfileFormData) => {
    if (!user || !firestore) {
      toast({ title: "You must be logged in to update your profile.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const { id: toastId } = toast({ title: "Updating profile...", description: "Please wait." });

    try {
      let newPhotoURL = user.photoURL;

      // 1. Upload new photo if it exists
      if (data.photo && data.photo[0]) {
        const file = data.photo[0];
        const compressedFile = await compressImage(file);
        const storageRef = ref(storage, `profile-pictures/${user.uid}/${Date.now()}-${compressedFile.name}`);
        const uploadResult = await uploadBytes(storageRef, compressedFile);
        newPhotoURL = await getDownloadURL(uploadResult.ref);
      }

      // 2. Update Firebase Auth profile
      await updateProfile(user, {
        displayName: data.displayName,
        photoURL: newPhotoURL,
      });

      // 3. Update Firestore profile document
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        displayName: data.displayName,
        photoURL: newPhotoURL,
      });

      toast({
        id: toastId,
        title: "Profile Updated Successfully!",
        className: 'bg-green-100 text-green-800'
      });
      router.push('/profile');

    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        id: toastId,
        title: "Update Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  
  if (!user) {
    router.replace('/login');
    return null;
  }

  return (
    <div className="container mx-auto max-w-lg py-8">
      <Button asChild variant="outline" className="mb-4">
        <Link href="/profile">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Profile
        </Link>
      </Button>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Edit Your Profile</CardTitle>
              <CardDescription>Make changes to your public profile information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField
                    control={form.control}
                    name="photo"
                    render={({ field }) => (
                        <FormItem className="flex flex-col items-center gap-4">
                             <Avatar className="h-24 w-24">
                                <AvatarImage src={avatarPreview || userProfile?.photoURL || ''} alt={userProfile?.displayName || 'User'}/>
                                <AvatarFallback>{userProfile?.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <FormControl>
                                <Input type="file" className="hidden" id="photo-upload" accept="image/*" onChange={handlePhotoChange} />
                            </FormControl>
                             <FormLabel htmlFor="photo-upload" className="cursor-pointer text-sm font-medium text-primary hover:underline">
                                Change Photo
                            </FormLabel>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Display Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Your display name" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
