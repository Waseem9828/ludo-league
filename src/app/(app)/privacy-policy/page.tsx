
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Privacy Policy
        </CardTitle>
      </CardHeader>
      <CardContent className="prose dark:prose-invert max-w-full">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2>1. Introduction</h2>
        <p>Welcome to ludoleague-online. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.</p>

        <h2>2. Information We Collect</h2>
        <p>We may collect information about you in a variety of ways. The information we may collect includes:</p>
        <ul>
            <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, and telephone number, that you voluntarily give to us when you <Link href="/signup">register with the application</Link>.</li>
            <li><strong>Financial Data:</strong> Data related to your payment method (e.g., bank account details, UPI ID) that we collect when you submit your <Link href="/kyc">KYC for withdrawals</Link>.</li>
            <li><strong>Data from Social Networks:</strong> User information from social networking sites, such as Google, including your name, your social network username, location, gender, birth date, email address, profile picture, and public data for contacts, if you connect your account to such social networks.</li>
        </ul>

        <h2>3. Use of Your Information</h2>
        <p>Having accurate information permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you to:</p>
        <ul>
            <li>Create and manage your <Link href="/profile">account</Link>.</li>
            <li>Process your <Link href="/wallet">transactions and withdrawal requests</Link>.</li>
            <li>Perform <Link href="/kyc">KYC verification</Link>.</li>
            <li>Monitor and analyze usage and trends to improve your experience.</li>
            <li>Prevent fraudulent transactions, monitor against theft, and protect against criminal activity.</li>
        </ul>
        
        <h2>4. Contact Us</h2>
        <p>If you have questions or comments about this Privacy Policy, please contact us at: <a href="mailto:support@ludoleague.online">support@ludoleague.online</a></p>
      </CardContent>
    </Card>
  );
}
