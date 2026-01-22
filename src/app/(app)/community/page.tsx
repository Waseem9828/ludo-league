
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newspaper, Users, Trophy, BarChart, MessageSquare, GraduationCap } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const bannerImage = PlaceHolderImages.find(img => img.id === 'community-banner');


const FeatureCard = ({ title, description, href, icon: Icon }: { title: string, description: string, href: string, icon: React.ElementType }) => (
    <Card className="shadow-md hover:shadow-lg transition-shadow hover:bg-muted/50">
        <CardHeader className="flex-row items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-lg">
                <Icon className="h-6 w-6 text-primary"/>
            </div>
            <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription className="mt-1">{description}</CardDescription>
            </div>
        </CardHeader>
        <CardContent>
            <Button asChild variant="outline">
                <Link href={href}>
                    Explore
                </Link>
            </Button>
        </CardContent>
    </Card>
);

export default function CommunityPage() {
  return (
    <div className="space-y-6">
        {bannerImage && (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-6">
                <Image src={bannerImage.imageUrl} alt={bannerImage.description} fill className="object-cover" priority />
            </div>
        )}
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Community Hub</h1>
      </div>
      <p className="text-lg text-muted-foreground">
        Connect with fellow Ludo enthusiasts, discuss strategies, and stay updated with the latest happenings in the Ludo League.
      </p>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        <FeatureCard 
            title="Community Forums"
            description="Join discussions, ask questions, and share your best Ludo moments with other players."
            href="#"
            icon={MessageSquare}
        />
        <FeatureCard 
            title="Leaderboards"
            description="See who's at the top! Check out the weekly and all-time rankings."
            href="/leaderboard"
            icon={BarChart}
        />
        <FeatureCard 
            title="Tournaments"
            description="Find and join exciting tournaments to compete for bigger prizes."
            href="/tournaments"
            icon={Trophy}
        />
         <FeatureCard 
            title="Latest News"
            description="Stay informed with the latest news, updates, and announcements from the Ludo League team."
            href="/news"
            icon={Newspaper}
        />
        <FeatureCard 
            title="Learning Center"
            description="New to the app? Find guides and FAQs to get started quickly."
            href="/tutorials"
            icon={GraduationCap}
        />
      </div>
    </div>
  );
}

    