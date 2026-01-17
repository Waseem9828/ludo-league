'use client';
import { useUser } from '@/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, Clock, ShieldAlert, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import Link from 'next/link';

export const KycStatusIndicator = () => {
    const { userProfile } = useUser();
    const status = userProfile?.kycStatus || 'not_submitted';
    const reason = userProfile?.kycRejectionReason;

    switch (status) {
        case 'approved':
            return (
                <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
                    <CheckCircle className="h-4 w-4 !text-green-600" />
                    <AlertTitle>KYC Approved</AlertTitle>
                    <AlertDescription>Your KYC has been successfully verified. Your wallet is fully active for withdrawals.</AlertDescription>
                </Alert>
            );
        case 'pending':
            return (
                <Alert variant="default" className="bg-yellow-50 border-yellow-200 text-yellow-800">
                    <Clock className="h-4 w-4 !text-yellow-600" />
                    <AlertTitle>KYC Pending</AlertTitle>
                    <AlertDescription>Your documents have been submitted and are under review. This usually takes 24-48 hours.</AlertDescription>
                </Alert>
            );
        case 'rejected':
            return (
                <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>KYC Rejected</AlertTitle>
                    <AlertDescription>
                        Your KYC submission was rejected. Please review the reason below and resubmit.
                        {reason && <p className="font-semibold mt-2">Reason: {reason}</p>}
                    </AlertDescription>
                </Alert>
            );
        case 'not_submitted':
            return (
                <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800">
                    <ShieldAlert className="h-4 w-4 !text-blue-600" />
                    <AlertTitle>KYC Required for Withdrawals</AlertTitle>
                    <AlertDescription>
                        Please complete your KYC verification to enable withdrawals and unlock all features.
                        <Button asChild size="sm" className="mt-2" variant="link">
                            <Link href="#submit-form">Start KYC Process</Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            )
        default:
            return null;
    }
};
