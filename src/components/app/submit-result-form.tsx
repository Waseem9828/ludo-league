"use client";

import { useState, useCallback, useEffect } from "react";
import { useUser, useFirestore, storage } from "@/firebase";
import {
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Sword, Flag, Upload, CheckCircle2, ArrowLeft } from "lucide-react";
import { compressImage } from "@/lib/image-utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import Link from "next/link";

interface SubmitResultFormProps {
  matchId: string;
}

export function SubmitResultForm({ matchId }: SubmitResultFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [result, setResult] = useState<"win" | "loss">("win");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !firestore) return;
    setIsLoading(true);
    const resultDocRef = doc(firestore, `matches/${matchId}/results`, user.uid);
    const unsubscribe = onSnapshot(resultDocRef, (doc) => {
        setHasSubmitted(doc.exists());
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user, firestore, matchId]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !firestore) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to submit a result.",
        variant: "destructive",
      });
      return;
    }

    if (!screenshot) {
      toast({
        title: "Screenshot Required",
        description: "You must upload a screenshot to claim a win or loss.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const { id: submittingToastId } = toast({ title: 'Submitting result...', description: 'Please wait.'});

    try {
      const compressedFile = await compressImage(screenshot);

      const storageRef = ref(
        storage,
        `match-results/${matchId}/${user.uid}/${compressedFile.name}`
      );
      
      const uploadResult = await uploadBytes(storageRef, compressedFile);
      const screenshotUrl = await getDownloadURL(uploadResult.ref);

      const resultRef = doc(firestore, `matches/${matchId}/results`, user.uid);
      await setDoc(resultRef, {
        userId: user.uid,
        status: result,
        position: result === 'win' ? 1 : 2,
        screenshotUrl,
        submittedAt: serverTimestamp(),
      });
      
      toast({
        id: submittingToastId,
        title: "Result Submitted!",
        description: "Your match result has been recorded.",
        className: 'bg-green-100 text-green-800'
      });
      setHasSubmitted(true);

    } catch (error: any) {
      console.error("Error submitting result:", error);
      toast({
        id: submittingToastId,
        title: "Submission Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
      return <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>;
  }

  if (hasSubmitted) {
    return (
        <div className="text-center space-y-4">
            <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
                <CheckCircle2 className="h-4 w-4 !text-green-500"/>
                <AlertTitle>Result Submitted</AlertTitle>
                <AlertDescription>You have already submitted your result. Please wait for the match to be resolved.</AlertDescription>
            </Alert>
             <Button asChild variant="outline">
                <Link href={`/match/${matchId}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Match
                </Link>
             </Button>
        </div>
    );
  }

  return (
    <div className="w-full">
        <form onSubmit={handleSubmit}>
            <div className="space-y-6">
                <RadioGroup
                    value={result}
                    onValueChange={(value: "win" | "loss") => setResult(value)}
                    className="grid grid-cols-2 gap-4"
                >
                    <Label className={`flex flex-col items-center justify-center rounded-md border-2 p-4 font-bold cursor-pointer transition-colors ${
                        result === 'win' ? 'border-primary bg-primary/10' : 'border-muted'
                    }`}>
                        <RadioGroupItem value="win" className="sr-only" />
                        <Shield className="h-8 w-8 mb-2 text-green-500"/>
                        I WON
                    </Label>
                    <Label className={`flex flex-col items-center justify-center rounded-md border-2 p-4 font-bold cursor-pointer transition-colors ${
                        result === 'loss' ? 'border-primary bg-primary/10' : 'border-muted'
                    }`}>
                        <RadioGroupItem value="loss" className="sr-only" />
                        <Sword className="h-8 w-8 mb-2 text-red-500"/>
                        I LOST
                    </Label>
                </RadioGroup>

                <div className="space-y-2">
                    <Label htmlFor="screenshot" className="flex items-center gap-2 font-semibold">
                        <Upload className="h-5 w-5 text-primary" />
                        Upload Winning/Losing Screenshot
                    </Label>
                    <Input
                        id="screenshot"
                        type="file"
                        required
                        onChange={handleFileChange}
                        accept="image/*"
                        className="file:text-primary file:font-semibold"
                    />
                     <p className="text-xs text-muted-foreground pt-1">
                        A clear screenshot of the final game screen is required.
                    </p>
                </div>
            </div>
             <div className="mt-6">
                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Submit Final Result
                </Button>
            </div>
        </form>
    </div>
  );
}
