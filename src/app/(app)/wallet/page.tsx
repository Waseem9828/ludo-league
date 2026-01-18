
'use client';
import Image from "next/image"
import Link from "next/link";
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { ArrowDownLeft, ArrowUpRight, UploadCloud, DownloadCloud, Landmark, Wallet as WalletIcon, AlertCircle, Loader2, ScanBarcode, ExternalLink, History, ArrowLeft } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { useUser, useFirestore, storage } from "@/firebase"
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, limit } from "firebase/firestore"
import { useEffect, useState, useMemo } from "react"
import type { Transaction, UpiConfiguration, DepositRequest, WithdrawalRequest } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { compressImage } from '@/lib/image-utils';

const bannerImage = PlaceHolderImages.find(img => img.id === 'wallet-banner');

// A type guard to check if an object is a DepositRequest
const isDepositRequest = (req: any): req is DepositRequest => 'screenshotUrl' in req;

const DynamicQrCode = ({ upiId, amount }: { upiId: string | null, amount: number }) => {
  if (!upiId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-4 bg-muted rounded-lg h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary"/>
        <p className="text-sm text-center text-muted-foreground">Loading Payment Details...</p>
      </div>
    );
  }
  
  const upiUrl = `upi://pay?pa=${upiId}&pn=LudoLeague&am=${amount.toFixed(2)}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`;

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-muted rounded-lg">
        <p className="text-sm text-center text-muted-foreground">Scan the QR or use the button below.</p>
        <Image src={qrUrl} alt="QR Code for payment" width={200} height={200} className="rounded-lg border-2 shadow-md bg-white" data-ai-hint="qr code for upi payment with amount" />
        <p className="font-bold text-center text-sm">UPI ID: {upiId}</p>
        <Button asChild className="w-full">
          <a href={upiUrl}>
            <ExternalLink className="mr-2 h-4 w-4"/>
            Pay with UPI App
          </a>
        </Button>
    </div>
  );
};


export default function WalletPage() {
  const { user, userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [depositHistory, setDepositHistory] = useState<DepositRequest[]>([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRequest[]>([]);
  const [combinedHistory, setCombinedHistory] = useState<(DepositRequest | WithdrawalRequest)[]>([]);

  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [depositAmount, setDepositAmount] = useState(100);
  const [depositScreenshot, setDepositScreenshot] = useState<File | null>(null);
  const [activeUpiId, setActiveUpiId] = useState<string | null>(null);
  const [depositStep, setDepositStep] = useState<'enterAmount' | 'confirmUtr'>('enterAmount');
  
  const balance = userProfile?.walletBalance ?? 0;

  useEffect(() => {
    if (!firestore) return;
    const upiConfigRef = doc(firestore, 'upiConfiguration', 'active');
    const unsubscribeUpi = onSnapshot(upiConfigRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as { activeUpiId: string };
        setActiveUpiId(data.activeUpiId);
      } else {
        console.log("No active UPI configuration found!");
        setActiveUpiId(null);
      }
    }, (error) => {
      console.error("Error fetching active UPI: ", error);
      setActiveUpiId(null);
    });

    return () => unsubscribeUpi();
  }, [firestore]);


  const transQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'transactions'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(10));
  }, [firestore, user]);

  const depositsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'depositRequests'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const withdrawalsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'withdrawalRequests'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
  }, [firestore, user]);


  useEffect(() => {
    if (!transQuery) {
        setTransactionsLoading(false);
        return;
    };
    setTransactionsLoading(true);
    const unsubscribeTrans = onSnapshot(transQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        setTransactions(data);
        setTransactionsLoading(false);
    }, (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `transactions where userId == ${user?.uid}`,
        operation: 'list',
      }));
      setTransactionsLoading(false);
    });

    return () => unsubscribeTrans();
  }, [transQuery, user]);

  useEffect(() => {
    if (!depositsQuery || !withdrawalsQuery) {
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);
    const unsubscribeDeposits = onSnapshot(depositsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DepositRequest));
        setDepositHistory(data);
    }, (error) => {
       errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `depositRequests where userId == ${user?.uid}`,
        operation: 'list',
      }));
    });
    
    const unsubscribeWithdrawals = onSnapshot(withdrawalsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest));
        setWithdrawalHistory(data);
    }, (error) => {
         errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `withdrawalRequests where userId == ${user?.uid}`,
            operation: 'list',
        }));
    });

    return () => {
        unsubscribeDeposits();
        unsubscribeWithdrawals();
    };
  }, [depositsQuery, withdrawalsQuery, user]);

  useEffect(() => {
    const combined = [...depositHistory, ...withdrawalHistory];
    combined.sort((a, b) => {
      const dateA = a.createdAt?.toDate()?.getTime() || 0;
      const dateB = b.createdAt?.toDate()?.getTime() || 0;
      return dateB - dateA;
    });
    setCombinedHistory(combined);
    if (depositHistory.length > 0 || withdrawalHistory.length > 0) {
        setHistoryLoading(false);
    }
  }, [depositHistory, withdrawalHistory]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setDepositScreenshot(e.target.files[0]);
    }
  };

  const handleConfirmPayment = () => {
    if (depositAmount < 100) {
      toast({
        title: "Invalid Amount",
        description: "Minimum deposit amount is ₹100.",
        variant: "destructive",
      });
      return;
    }
    if (!activeUpiId) {
        toast({
            title: "Payment Details Not Available",
            description: "Please wait for the payment QR code to load.",
            variant: "destructive",
        });
        return;
    }
    setDepositStep('confirmUtr');
  };

  const handleDepositSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !firestore || !depositScreenshot) {
        toast({ title: "Please fill all fields and upload a screenshot.", variant: "destructive" });
        return;
    }

    const formData = new FormData(e.currentTarget);
    const utr = formData.get('utr') as string;
    
    if(!utr) {
        toast({title: "UTR / Transaction ID is required.", variant: "destructive"});
        return;
    }
    
    setIsSubmitting(true);
    const { id: toastId } = toast({ title: 'Submitting deposit request...' });
    try {
        const compressedFile = await compressImage(depositScreenshot);
        
        const storageRef = ref(storage, `deposits/${user.uid}/${Date.now()}-${compressedFile.name}`);

        const uploadResult = await uploadBytes(storageRef, compressedFile);
        const screenshotUrl = await getDownloadURL(uploadResult.ref);

        await addDoc(collection(firestore, 'depositRequests'), {
            userId: user.uid,
            amount: depositAmount,
            utr,
            screenshotUrl,
            status: 'pending',
            createdAt: serverTimestamp(),
            userName: user.displayName, // For easier review in admin panel
        } as Omit<DepositRequest, 'id'>);
        
        toast({ id: toastId, title: "Deposit request submitted successfully.", description: "Your request is under review and will be processed shortly.", className: 'bg-green-100 text-green-800' });
        (e.target as HTMLFormElement).reset();
        setDepositScreenshot(null);
        setDepositAmount(100);
        setDepositStep('enterAmount');

    } catch (error: any) {
        console.error("Deposit Error:", error);
        toast({ id: toastId, title: "Deposit Failed", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
     if (!user || !firestore || !userProfile) {
        toast({ title: "Please login first", variant: "destructive" });
        return;
    }
    if(userProfile?.kycStatus !== 'approved') {
        toast({ title: "KYC not approved", description: "Please complete your KYC to enable withdrawals.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('withdraw-amount'));

    if (!amount || amount < 300) {
        toast({ title: "Invalid Amount", description: "Minimum withdrawal is ₹300.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    if (amount > balance) {
        toast({ title: "Insufficient Balance", variant: "destructive"});
        setIsSubmitting(false);
        return;
    }

    try {
        await addDoc(collection(firestore, 'withdrawalRequests'), {
            userId: user.uid,
            amount,
            status: 'pending',
            createdAt: serverTimestamp(),
            upiId: userProfile.upiId || '',
            bankDetails: userProfile.bankDetails || '',
            userName: user.displayName, // For admin panel
        } as Omit<WithdrawalRequest, 'id'>);
        toast({ title: "Withdrawal request submitted successfully." });
        (e.target as HTMLFormElement).reset();
    } catch(error: any) {
        toast({ title: "Request Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl p-4 md:p-6 space-y-6">
        <div className="relative w-full aspect-video md:aspect-[21/9] rounded-lg overflow-hidden mb-6 shadow-lg">
            <Image src="/wallet-banner.png" alt="Wallet Banner" fill className="object-cover" priority />
        </div>
        <Card className="shadow-md">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="grid gap-1.5">
                    <CardTitle>Current Balance</CardTitle>
                    <CardDescription>Total funds available for matches.</CardDescription>
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-primary">
                    ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </CardHeader>
        </Card>

        <Tabs defaultValue="deposit" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="deposit"><UploadCloud className="mr-1.5 h-4 w-4"/>Deposit</TabsTrigger>
                <TabsTrigger value="withdraw"><DownloadCloud className="mr-1.5 h-4 w-4"/>Withdraw</TabsTrigger>
                <TabsTrigger value="history"><History className="mr-1.5 h-4 w-4"/>History</TabsTrigger>
            </TabsList>
            <TabsContent value="deposit">
                <Card>
                    {depositStep === 'enterAmount' ? (
                        <>
                            <CardHeader>
                                <CardTitle>Deposit Funds</CardTitle>
                                <CardDescription>Step 1: Enter amount and complete the payment.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Important: Name Match Required</AlertTitle>
                                        <AlertDescription>
                                            Please deposit from a bank account or UPI ID where the name matches your KYC documents. Mismatched names will result in rejection.
                                        </AlertDescription>
                                    </Alert>
                                    <div className="grid gap-2">
                                        <Label htmlFor="deposit-amount">Amount (Min. ₹100)</Label>
                                        <Input name="deposit-amount" id="deposit-amount" value={depositAmount} onChange={(e) => setDepositAmount(Number(e.target.value))} placeholder="e.g., 500" type="number" required />
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-4">
                                    {depositAmount >= 100 ? (
                                        <DynamicQrCode upiId={activeUpiId} amount={depositAmount} />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center gap-4 p-4 bg-muted rounded-lg h-full">
                                            <ScanBarcode className="h-10 w-10 text-muted-foreground"/>
                                            <p className="text-sm text-center text-muted-foreground">Enter an amount of ₹100 or more to generate QR code.</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="button" onClick={handleConfirmPayment} className="w-full">
                                    I have made the payment, Confirm
                                </Button>
                            </CardFooter>
                        </>
                    ) : (
                        <form onSubmit={handleDepositSubmit}>
                            <CardHeader>
                                <Button variant="ghost" size="sm" className="absolute left-2 top-2 h-8" onClick={() => setDepositStep('enterAmount')}>
                                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                                </Button>
                                <CardTitle className="pt-8">Confirm Your Deposit</CardTitle>
                                <CardDescription>Step 2: Submit your payment details for verification.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex justify-between items-center bg-muted p-3 rounded-lg">
                                    <span className="text-sm font-medium">Amount Paid:</span>
                                    <span className="text-xl font-bold text-primary">₹{depositAmount.toFixed(2)}</span>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="utr">UTR / Transaction ID</Label>
                                    <Input name="utr" id="utr" placeholder="Enter the 12-digit UTR number" required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="screenshot">Payment Screenshot</Label>
                                    <Input name="screenshot" id="screenshot" type="file" required onChange={handleFileChange} className="file:text-primary" accept="image/*"/>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" disabled={isSubmitting} className="w-full">
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    Submit Deposit Request
                                </Button>
                            </CardFooter>
                        </form>
                    )}
                </Card>
            </TabsContent>
            <TabsContent value="withdraw">
                <Card>
                    <form onSubmit={handleWithdrawalSubmit}>
                        <CardHeader>
                            <CardTitle>Withdraw Funds</CardTitle>
                            <CardDescription>Request a withdrawal to your verified account.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <Alert>
                                <Landmark className="h-4 w-4" />
                                <AlertTitle>Withdrawal Policy</AlertTitle>
                                <AlertDescription>
                                    KYC must be approved. Minimum withdrawal is ₹300. Requests may take up to 24 hours to process.
                                </AlertDescription>
                            </Alert>
                            <div className="grid gap-2">
                                <Label htmlFor="withdraw-amount">Amount (Min. ₹300)</Label>
                                <Input name="withdraw-amount" id="withdraw-amount" placeholder="e.g., 1000" type="number" required />
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col gap-4">
                             <Button type="submit" variant="destructive" className="w-full" disabled={isSubmitting || userProfile?.kycStatus !== 'approved'}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Request Withdrawal
                            </Button>
                             {userProfile?.kycStatus !== 'approved' && (
                                 <div className="text-center space-y-1">
                                    <p className="text-sm text-destructive">
                                        KYC must be approved to enable withdrawals.
                                    </p>
                                    <Button asChild variant="link" className="p-0 h-auto">
                                        <Link href="/kyc">
                                            Go to KYC Page
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </CardFooter>
                    </form>
                </Card>
            </TabsContent>
            <TabsContent value="history">
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Deposit & Withdrawal History</CardTitle>
                            <CardDescription>An overview of your recent deposit and withdrawal requests.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                           {historyLoading && <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div>}
                            {!historyLoading && combinedHistory.length === 0 && <p className="text-center text-muted-foreground py-8">No requests found.</p>}
                            
                            {!historyLoading && combinedHistory.map((req) => {
                                const isDeposit = isDepositRequest(req);
                                return (
                                <Card key={req.id} className="p-3">
                                    <div className="flex flex-wrap gap-2 justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2 rounded-full", isDeposit ? "bg-green-100" : "bg-red-100")}>
                                                {isDeposit ? <ArrowUpRight className="h-4 w-4 text-green-600"/> : <ArrowDownLeft className="h-4 w-4 text-red-600"/>}
                                            </div>
                                            <div>
                                                <p className="font-semibold">{isDeposit ? 'Deposit Request' : 'Withdrawal Request'}</p>
                                                <p className="text-xs text-muted-foreground">{req.createdAt?.toDate().toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                             <p className={cn("font-bold text-lg", isDeposit ? "text-green-600" : "text-red-600")}>₹{req.amount.toFixed(2)}</p>
                                            <Badge variant={req.status === 'approved' ? 'default' : req.status === 'pending' ? 'secondary' : 'destructive'} className={cn('mt-1', {'bg-green-100 text-green-800': req.status === 'approved'})}>
                                                {req.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    {req.rejectionReason && <p className="text-xs text-destructive mt-2 pt-2 border-t">Reason: {req.rejectionReason}</p>}
                                </Card>
                            )})}
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Transactions</CardTitle>
                            <CardDescription>A log of your 10 most recent wallet movements.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            {transactionsLoading && <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div>}
                            {!transactionsLoading && transactions.length === 0 && <p className="text-center text-muted-foreground py-8">No transactions yet.</p>}
                            {!transactionsLoading && transactions.map((t) => (
                                <Card key={t.id} className="p-3">
                                    <div className="flex flex-wrap gap-2 justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2 rounded-full", t.amount >= 0 ? "bg-green-100" : "bg-red-100")}>
                                                {t.amount >= 0 ? <ArrowUpRight className="h-4 w-4 text-green-600"/> : <ArrowDownLeft className="h-4 w-4 text-red-500"/>}
                                            </div>
                                            <div>
                                                <p className="font-semibold capitalize">{t.description || t.type.replace('-', ' ')}</p>
                                                <p className="text-xs text-muted-foreground">{t.createdAt?.toDate().toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn("font-bold text-lg", t.amount >= 0 ? "text-green-600" : "text-red-500")}>
                                                {t.amount >= 0 ? '+' : ''}₹{t.amount.toFixed(2)}
                                            </p>
                                             <Badge variant={t.status === 'completed' ? 'default' : t.status === 'pending' ? 'secondary' : 'destructive'} className={cn('mt-1', {'bg-green-100 text-green-800': t.status === 'completed'})}>
                                                {t.status}
                                             </Badge>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
        </Tabs>
    </div>
  )
}
