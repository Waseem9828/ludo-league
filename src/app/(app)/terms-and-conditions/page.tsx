
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gavel } from "lucide-react";

export default function TermsAndConditionsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gavel className="h-6 w-6 text-primary" />
          Terms & Conditions
        </CardTitle>
      </CardHeader>
      <CardContent className="prose dark:prose-invert max-w-full">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2>1. Agreement to Terms</h2>
        <p>By using our Ludo League application, you agree to be bound by these Terms and Conditions. If you do not agree, do not use the application.</p>

        <h2>2. User Accounts</h2>
        <p>You are responsible for safeguarding your account and for any activities or actions under your account. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</p>

        <h2>3. Prohibited Activities</h2>
        <p>You agree not to engage in any of the following prohibited activities:</p>
        <ul>
            <li>Using fraudulent information or documents for KYC.</li>
            <li>Submitting fake or manipulated match result screenshots.</li>
            <li>Using multiple accounts to gain an unfair advantage.</li>
            <li>Any activity that is illegal or violates these terms.</li>
        </ul>

        <h2>4. Termination</h2>
        <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
        
        <h2>5. Contact Us</h2>
        <p>If you have any questions about these Terms, please contact us at: legal@ludoleague.app</p>
      </CardContent>
    </Card>
  );
}
