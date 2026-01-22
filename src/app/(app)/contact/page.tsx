
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, MessageSquare, Phone } from "lucide-react";
import Link from 'next/link';

const ContactMethod = ({ icon: Icon, title, value, href }: { icon: React.ElementType, title: string, value: string, href: string }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
        <Card className="shadow-md hover:shadow-lg transition-shadow hover:bg-muted/50 text-center h-full">
            <CardHeader className="items-center">
                <div className="bg-primary/10 p-4 rounded-full">
                    <Icon className="h-8 w-8 text-primary"/>
                </div>
            </CardHeader>
            <CardContent>
                <CardTitle>{title}</CardTitle>
                <CardDescription className="mt-2 text-lg">{value}</CardDescription>
            </CardContent>
        </Card>
    </a>
)

export default function ContactPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Contact Us</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          We&apos;re here to help! Reach out to us through any of the channels below.
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6 pt-8">
        <ContactMethod 
            title="General Support"
            value="support@ludoleague.online"
            href="mailto:support@ludoleague.online"
            icon={Mail}
        />
         <ContactMethod 
            title="Live Chat"
            value="Chat with us"
            href="/support"
            icon={MessageSquare}
        />
         <ContactMethod 
            title="Business Inquiries"
            value="business@ludoleague.online"
            href="mailto:business@ludoleague.online"
            icon={Phone}
        />
      </div>
    </div>
  );
}
