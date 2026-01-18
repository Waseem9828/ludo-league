
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GraduationCap, Wallet, UploadCloud, DownloadCloud, Gamepad2, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const bannerImage = PlaceHolderImages.find(img => img.id === 'tutorials-banner');


const TutorialItem = ({ title, children, icon: Icon }: { title: string, children: React.ReactNode, icon: React.ElementType }) => (
    <AccordionItem value={title}>
        <AccordionTrigger>
            <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-primary"/>
                <span className="font-semibold">{title}</span>
            </div>
        </AccordionTrigger>
        <AccordionContent className="prose dark:prose-invert max-w-full pl-10">
            {children}
        </AccordionContent>
    </AccordionItem>
);

export default function TutorialsPage() {
  return (
    <div className="space-y-6">
        {bannerImage && (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-6">
                <Image src={bannerImage.imageUrl} alt={bannerImage.description} fill className="object-cover" priority />
            </div>
        )}
        <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Learning Center</h1>
        </div>
        <p className="text-lg text-muted-foreground">
            New to Ludo League or need a refresher? Find answers to common questions and learn how to use the app effectively.
        </p>

      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>Click on a topic to learn more.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <TutorialItem title="How to Play a Match?" icon={Gamepad2}>
                <ol>
                    <li>Go to the <strong>Lobby</strong> page.</li>
                    <li>Find an open match or create your own by clicking &apos;Create Match&apos;.</li>
                    <li>Once an opponent joins (or you join a match), the status will change to &apos;in-progress&apos;.</li>
                    <li>Go to the match page, copy the Ludo King room code provided by the creator.</li>
                    <li>Play the game in your Ludo King app.</li>
                    <li>After the game, take a screenshot of the win/loss screen.</li>
                    <li>Come back to the match page and submit your result with the screenshot.</li>
                </ol>
            </TutorialItem>
             <TutorialItem title="How to Deposit Money?" icon={UploadCloud}>
                <ol>
                    <li>Navigate to the <strong>Wallet</strong> page and select the &apos;Deposit&apos; tab.</li>
                    <li>Enter the amount you wish to deposit (minimum ₹100).</li>
                    <li>Scan the QR code with your UPI app or use the &apos;Pay with UPI&apos; button.</li>
                    <li>After successful payment, enter the UTR/Transaction ID and upload a screenshot of the payment.</li>
                    <li>Click &apos;Submit Deposit Request&apos;. Our team will verify it shortly.</li>
                </ol>
            </TutorialItem>
            <TutorialItem title="How to Withdraw Winnings?" icon={DownloadCloud}>
                 <ol>
                    <li>First, ensure your <strong>KYC is approved</strong>. You can&apos;t withdraw without it.</li>
                    <li>Go to the <strong>Wallet</strong> page and select the &apos;Withdraw&apos; tab.</li>
                    <li>Your verified bank details or UPI ID will be shown.</li>
                    <li>Enter the amount you wish to withdraw (minimum ₹300).</li>
                    <li>Click &apos;Request Withdrawal&apos;. Your request will be processed within 24 hours.</li>
                </ol>
            </TutorialItem>
            <TutorialItem title="How does KYC Verification work?" icon={ShieldCheck}>
                <ol>
                    <li>Go to the <strong>KYC</strong> page.</li>
                    <li>Upload a clear picture of your Aadhaar or PAN card.</li>
                    <li>Upload a clear selfie of yourself.</li>
                    <li>Enter your bank account details or UPI ID for withdrawals.</li>
                    <li>Submit the form. Our team will review your documents within 48 hours.</li>
                    <li>You will be notified once your KYC is approved or if it is rejected with a reason.</li>
                </ol>
            </TutorialItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
