
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useFirestore, useStorage } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useParams, useRouter } from 'next/navigation';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Upload } from 'lucide-react';

const resultSchema = z.object({
  result: z.enum(['win', 'loss', 'draw'], { required_error: 'You must select a result.' }),
  screenshot: z.any().refine(files => files?.length > 0, 'Screenshot is required.'),
});

type ResultFormValues = z.infer<typeof resultSchema>;

export default function SubmitResultPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const matchId = params.id as string;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<ResultFormValues>({
    resolver: zodResolver(resultSchema),
  });

  const onSubmit = async (data: ResultFormValues) => {
    if (!user || !firestore || !storage) {
      toast({ title: 'Something went wrong', description: 'Please try again.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const screenshotFile = data.screenshot[0];
      // Corrected storage path
      const storageRef = ref(storage, `match-results/${matchId}/${user.uid}`);
      await uploadBytes(storageRef, screenshotFile);
      const screenshotUrl = await getDownloadURL(storageRef);

      const matchRef = doc(firestore, 'matches', matchId);
      await updateDoc(matchRef, {
        [`results.${user.uid}`]: {
          result: data.result,
          screenshotUrl,
          submittedAt: serverTimestamp(),
        },
        status: 'RESULT_PENDING',
        updatedAt: serverTimestamp(),
      });

      toast({ title: 'Result Submitted', description: 'Your result has been submitted successfully.' });
      router.push(`/match/${matchId}`);
    } catch (error: any) {
      console.error("Error submitting result:", error);
      toast({ title: 'Failed to submit result', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-lg py-8">
      <Card>
        <CardHeader>
          <CardTitle>Submit Match Result</CardTitle>
          <CardDescription>Select the outcome of the match and upload a screenshot as proof.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Controller
              name="result"
              control={control}
              render={({ field }) => (
                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="win" id="win" />
                    <Label htmlFor="win">I Won</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="loss" id="loss" />
                    <Label htmlFor="loss">I Lost</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="draw" id="draw" />
                    <Label htmlFor="draw">It's a Draw</Label>
                  </div>
                </RadioGroup>
              )}
            />
            {errors.result && <p className="text-sm text-destructive">{errors.result.message}</p>}

            <Controller
              name="screenshot"
              control={control}
              render={({ field: { onChange, value, ...rest } }) => (
                <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files)} {...rest} />
              )}
            />
            {errors.screenshot && <p className="text-sm text-destructive">{errors.screenshot.message}</p>}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Submit Result
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
