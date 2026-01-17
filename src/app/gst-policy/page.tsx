

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function GstPolicyPage() {
  return (
    <div className="container mx-auto py-8">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                GST Policy
                </CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-full">
                <p>Last updated: {new Date().toLocaleDateString()}</p>
                
                <h2>1. GST on Deposits</h2>
                <p>As per the Government of India&apos;s regulations, a Goods and Services Tax (GST) of 28% is applicable on all deposits made by players into their wallet on the Ludo League platform. This is in compliance with the amendments to the GST law for online real-money gaming.</p>
                <p>For example, if you deposit ₹100, the amount credited to your wallet will be calculated after deducting the 28% GST. The taxable value will be ₹78.12, and the GST amount will be ₹21.88.</p>

                <h2>2. How GST is Calculated</h2>
                <p>The GST is levied on the total amount you deposit. It is not charged on individual game entry fees or on winnings. The tax is collected at the time of deposit itself.</p>

                <h2>3. No GST on Winnings</h2>
                <p>There is no GST levied on the prize money you win from playing matches or tournaments on our platform. However, winnings may be subject to TDS (Tax Deducted at Source) as per the Income Tax Act, which is a separate compliance.</p>
                
                <h2>4. Invoices and Compliance</h2>
                <p>We are fully compliant with the GST regulations. Invoices for the GST paid on your deposits will be available upon request. We ensure that all collected taxes are duly paid to the government authorities.</p>

                <h2>5. Contact Us</h2>
                <p>If you have any further questions regarding our GST policy, please do not hesitate to contact our support team at: finance@ludoleague.app</p>
            </CardContent>
        </Card>
    </div>
  );
}
