
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark } from "lucide-react";

export default function RefundPolicyPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="h-6 w-6 text-primary" />
          Refund Policy
        </CardTitle>
      </CardHeader>
      <CardContent className="prose dark:prose-invert max-w-full">
        <p>Last updated: {new Date().toLocaleDateString()}</p>

        <h2>1. General Policy</h2>
        <p>Entry fees for matches and tournaments are non-refundable once the match or tournament has started. We encourage players to be certain before joining any paid contest.</p>

        <h2>2. Match Cancellation</h2>
        <p>If a match is cancelled by Ludo League administrators due to technical issues, server problems, or any other unforeseen circumstances from our end, a full refund of the entry fee will be automatically credited to your wallet.</p>
        
        <h2>3. Disputed Matches</h2>
        <p>In case of a disputed match, our admin team will review the evidence provided by all players. Based on the review, the admin may decide to refund the entry fee to one or more players. The admin&apos;s decision will be final.</p>
        
        <h2>4. Incorrect Deposits</h2>
        <p>Funds deposited to your wallet are final. We are not liable for refunds in case you deposit an incorrect amount. Please double-check the amount before making a payment.</p>

        <h2>5. Contact Us</h2>
        <p>For any refund-related queries, please contact our support team with your transaction ID at: support@ludoleague.app</p>
      </CardContent>
    </Card>
  );
}
