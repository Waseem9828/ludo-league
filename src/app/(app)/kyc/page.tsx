'use client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useUser, useFirestore, storage } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { compressImage } from '@/lib/image-utils';
import { Loader2, ShieldCheck } from 'lucide-react';
import { KycStatusIndicator } from '@/components/app/kyc-status-indicator';

const kycSchema = z.object({
  fullName: z.string().min(2, "Full name is required."),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date of birth."),
  aadhaarNumber: z.string().optional(),
  panNumber: z.string().optional(),
  aadhaarImage: z.any().optional(),
  panImage: z.any().optional(),
  selfie: z.any().refine(file => file?.length > 0, 'A selfie is required.'),
  bankDetails: z.string().optional(),
  upiId: z.string().optional(),
}).refine(data => data.aadhaarNumber || data.panNumber, {
  message: "Either Aadhaar or PAN number is required.",
  path: ["aadhaarNumber"],
}).refine(data => data.aadhaarNumber ? data.aadhaarImage?.[0] : true, {
    message: "Aadhaar image is required if number is provided.",
    path: ["aadhaarImage"],
}).refine(data => data.panNumber ? data.panImage?.[0] : true, {
    message: "PAN image is required if number is provided.",
    path: ["panImage"],
});

type KycFormData = z.infer<typeof kycSchema>;

export default function KycPage() {
    const { user, userProfile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<KycFormData>({
        resolver: zodResolver(kycSchema),
        defaultValues: {
          fullName: userProfile?.displayName || '',
          dateOfBirth: '',
          aadhaarNumber: '',
          panNumber: '',
          bankDetails: '',
          upiId: '',
          aadhaarImage: null,
          panImage: null,
          selfie: null,
        }
    });

    const uploadFile = async (file: File, path: string): Promise<string> => {
        const compressedFile = await compressImage(file);
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, compressedFile);
        const downloadUrl = await getDownloadURL(storageRef);
        return downloadUrl;
    };

    const onSubmit = async (data: KycFormData) => {
        if (!user || !firestore) return;
        
        setIsSubmitting(true);
        const { id: toastId, update } = toast({ title: "Submitting KYC...", description: "Please wait while we upload your documents." });

        try {
            const userId = user.uid;
            
            const uploadPromises: { type: 'selfie' | 'aadhaar' | 'pan'; urlPromise: Promise<string> }[] = [];

            if (data.selfie?.[0]) {
                const selfiePromise = uploadFile(data.selfie[0], `kyc/${userId}/selfie.jpg`);
                uploadPromises.push({ type: 'selfie', urlPromise: selfiePromise });
            }
            if (data.aadhaarImage?.[0]) {
                const aadhaarPromise = uploadFile(data.aadhaarImage[0], `kyc/${userId}/aadhaar.jpg`);
                uploadPromises.push({ type: 'aadhaar', urlPromise: aadhaarPromise });
            }
            if (data.panImage?.[0]) {
                const panPromise = uploadFile(data.panImage[0], `kyc/${userId}/pan.jpg`);
                uploadPromises.push({ type: 'pan', urlPromise: panPromise });
            }

            const settledPromises = await Promise.all(uploadPromises.map(p => p.urlPromise));
            
            const urls = settledPromises.map((url, index) => ({
                type: uploadPromises[index].type,
                url,
            }));

            const selfieUrl = urls.find(u => u.type === 'selfie')?.url || '';
            const aadhaarUrl = urls.find(u => u.type === 'aadhaar')?.url || '';
            const panUrl = urls.find(u => u.type === 'pan')?.url || '';

            const kycDocRef = doc(firestore, 'kycApplications', user.uid);

            await setDoc(kycDocRef, {
                userId,
                userName: userProfile?.displayName,
                userAvatar: userProfile?.photoURL,
                status: 'pending',
                submittedAt: serverTimestamp(),
                fullName: data.fullName,
                dateOfBirth: data.dateOfBirth,
                aadhaarNumber: data.aadhaarNumber || null,
                panNumber: data.panNumber || null,
                selfieUrl,
                aadhaarUrl: aadhaarUrl || null,
                panUrl: panUrl || null,
                bankDetails: data.bankDetails || null,
                upiId: data.upiId || null,
            });

            await setDoc(doc(firestore, 'users', userId), {
                kycStatus: 'pending',
            }, { merge: true });

            update({ id: toastId, title: "KYC Submitted Successfully!", description: "Your documents are under review.", className: 'bg-green-100 text-green-800' });
            form.reset();

        } catch (error: any) {
             update({ id: toastId, title: "Submission Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (userProfile?.kycStatus === 'approved' || userProfile?.kycStatus === 'pending') {
        return (
             <div className="container mx-auto py-8">
                 <KycStatusIndicator />
             </div>
        );
    }

    return (
        <Form {...form}>
            <div className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShieldCheck/> KYC Verification</CardTitle>
                    <CardDescription>Please provide your details for verification. This is required to enable withdrawals.</CardDescription>
                </CardHeader>
                 {userProfile?.kycStatus === 'rejected' && <div className="px-6 pb-4"><KycStatusIndicator /></div>}
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent id="submit-form" className="space-y-6">
                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name (as per ID)</FormLabel>
                                    <FormControl><Input placeholder="Enter your full name" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="dateOfBirth"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Date of Birth</FormLabel>
                                    <FormControl><Input type="date" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="aadhaarNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Aadhaar Number (12 digits)</FormLabel>
                                    <FormControl><Input placeholder="XXXX XXXX XXXX" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="aadhaarImage"
                            render={({ field: {onChange, value, ...rest}}) => (
                                <FormItem>
                                    <FormLabel>Aadhaar Card Image (Front)</FormLabel>
                                    <FormControl><Input type="file" accept="image/*" onChange={e => onChange(e.target.files)} {...rest} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="panNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>PAN Number</FormLabel>
                                    <FormControl><Input placeholder="ABCDE1234F" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="panImage"
                            render={({ field: {onChange, value, ...rest}}) => (
                                <FormItem>
                                    <FormLabel>PAN Card Image</FormLabel>
                                    <FormControl><Input type="file" accept="image/*" onChange={e => onChange(e.target.files)} {...rest} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="selfie"
                            render={({ field: {onChange, value, ...rest} }) => (
                                <FormItem>
                                    <FormLabel>Clear Selfie</FormLabel>
                                    <FormControl><Input type="file" accept="image/*" onChange={e => onChange(e.target.files)} {...rest} /></FormControl>
                                    <FormDescription>Upload a clear, recent selfie.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="upiId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>UPI ID (for withdrawals)</FormLabel>
                                    <FormControl><Input placeholder="yourname@upi" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="bankDetails"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bank Account Details (Optional)</FormLabel>
                                    <FormControl><Input placeholder="Name, Acc No, IFSC" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isSubmitting} className="w-full">
                             {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Submit for Verification
                        </Button>
                    </CardFooter>
                </form>
            </Card>
            </div>
        </Form>
    );
}
