'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newspaper, Users, Trophy, BarChart, MessageSquare, GraduationCap, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { motion, Variants } from 'framer-motion';

const bannerImage = PlaceHolderImages.find(img => img.id === 'community-banner');

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
    },
  },
};

const FeatureCard = ({ title, description, href, icon: Icon }: { title: string, description: string, href: string, icon: React.ElementType }) => (
    <motion.div variants={itemVariants} className="h-full">
        <Link href={href} className="block h-full">
            <Card className="shadow-md hover:shadow-xl transition-all duration-300 h-full flex flex-col group border-border/20 hover:border-primary/50 hover:-translate-y-1">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="bg-primary/10 p-3 rounded-full border-2 border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <Icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors"/>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
                    </div>
                </CardHeader>
                <CardContent className="flex-grow">
                    <CardTitle className="text-lg">{title}</CardTitle>
                    <CardDescription className="mt-2 text-sm">{description}</CardDescription>
                </CardContent>
            </Card>
        </Link>
    </motion.div>
);

export default function CommunityPage() {
  return (
    <div className="space-y-8">
        {bannerImage && (
             <motion.div 
                className="relative w-full aspect-video md:aspect-[21/9] rounded-2xl overflow-hidden mb-8 shadow-2xl shadow-primary/10"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                <Image src={bannerImage.imageUrl} alt={bannerImage.description} fill className="object-cover" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                 <div className="absolute bottom-0 left-0 p-6 text-white">
                    <motion.h1 
                        className="text-3xl md:text-5xl font-bold tracking-tight mb-2 text-gradient-primary bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                    >
                        Community Hub
                    </motion.h1>
                    <motion.p 
                        className="text-base md:text-lg max-w-2xl text-white/80"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                    >
                        Connect, compete, and grow with the Ludo League family.
                    </motion.p>
                </div>
            </motion.div>
        )}
      
      <motion.div 
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <FeatureCard 
            title="Community Forums"
            description="Join discussions, ask questions, and share your best Ludo moments with other players."
            href="/community/forum"
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
         <FeatureCard 
            title="About Us"
            description="Learn more about our mission and our commitment to fair play."
            href="/about"
            icon={Users}
        />
      </motion.div>
    </div>
  );
}