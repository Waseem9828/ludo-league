
'use client';
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Calendar, Users, Trophy, Ticket, CircleDotDashed, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFirestore } from "@/firebase";
import { useUser } from "@/firebase/auth/use-user";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useEffect, useState } from "react";
import type { Tournament } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { getTournamentStatus } from "@/lib/types";
import { useCountdown } from "@/hooks/use-countdown";
import { formatDistanceToNowStrict } from 'date-fns';


const bannerImage = { imageUrl: 'https://picsum.photos/seed/tourney/800/400', description: 'Tournaments Banner' };

const CountdownTimer = ({ targetDate }: { targetDate: Date }) => {
    const { days, hours, minutes, seconds } = useCountdown(targetDate);
    const hasEnded = days + hours + minutes + seconds <= 0;

    if (hasEnded) {
        return <span className="font-semibold text-destructive">Ended</span>;
    }

    return (
        <span className="font-semibold text-destructive animate-pulse">
            {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
    );
};


const TournamentCard = ({ tournament }: { tournament: Tournament | null }) => {
    const { user } = useUser();

    if (!tournament) {
        return (
            <Card className="flex flex-col overflow-hidden animate-pulse">
                <div className="relative h-40 w-full bg-muted"></div>
                <CardHeader>
                    <div className="h-6 w-3/4 bg-muted rounded-md"></div>
                    <div className="h-4 w-1/2 bg-muted rounded-md mt-2"></div>
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                    <div className="flex justify-between items-center">
                        <div className="h-4 w-1/3 bg-muted rounded-md"></div>
                        <div className="h-4 w-1/4 bg-muted rounded-md"></div>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="h-4 w-1/3 bg-muted rounded-md"></div>
                        <div className="h-4 w-1/4 bg-muted rounded-md"></div>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="h-4 w-1/3 bg-muted rounded-md"></div>
                        <div className="h-4 w-1/4 bg-muted rounded-md"></div>
                    </div>
                </CardContent>
                <CardFooter>
                    <div className="h-10 w-full bg-muted rounded-md"></div>
                </CardFooter>
            </Card>
        );
    }
    
    const status = getTournamentStatus(tournament);
    const isJoined = user && tournament.playerIds && tournament.playerIds.includes(user.uid);
    const isFull = tournament.filledSlots >= tournament.totalSlots;

    const getAction = () => {
        switch (status) {
            case 'upcoming':
                if (isFull && !isJoined) return <Button className="w-full" variant="secondary" disabled>Slots Full</Button>;
                if (isJoined) return <Button asChild className="w-full" variant="outline"><Link href={`/tournaments/${tournament.id}`}>View Details</Link></Button>;
                return <Button asChild className="w-full" variant="accent"><Link href={`/tournaments/${tournament.id}`}>Join Now</Link></Button>;
            case 'live':
                return <Button asChild className="w-full" variant="destructive"><Link href={`/tournaments/${tournament.id}`}>Watch Live</Link></Button>;
            case 'completed':
                 return <Button asChild className="w-full" variant="outline"><Link href={`/tournaments/${tournament.id}`}>View Results</Link></Button>;
            default:
                 return <Button asChild className="w-full" variant="outline"><Link href={`/tournaments/${tournament.id}`}>View Details</Link></Button>;
        }
    };


    return (
        <Card className="flex flex-col overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
             <Link href={`/tournaments/${tournament.id}`} className="block">
                <div className="relative h-40 w-full">
                    {tournament.bannerImageUrl ? (
                        <Image
                            src={tournament.bannerImageUrl}
                            alt={`${tournament.name} banner`}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted">
                            <Trophy className="h-16 w-16 text-muted-foreground" />
                        </div>
                    )}
                    <Badge 
                        className={cn("absolute top-2 right-2 text-xs font-bold", {
                            "bg-yellow-500 text-white": status === 'upcoming',
                            "bg-red-600 text-white animate-pulse": status === 'live',
                            "bg-green-600 text-white": status === 'completed',
                             "bg-gray-500 text-white": status === 'cancelled' || status === 'paused',
                        })}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                </div>
            </Link>
            <CardHeader>
                <CardTitle>{tournament.name}</CardTitle>
                {tournament.startTime && (
                    <CardDescription className="flex items-center gap-2 pt-1 text-sm">
                        <Clock className="h-4 w-4" />
                        {status === 'upcoming' && <span>Starts in {formatDistanceToNowStrict(tournament.startTime.toDate())}</span>}
                        {status === 'live' && <span>Ends in <CountdownTimer targetDate={tournament.endTime.toDate()}/></span>}
                        {status === 'completed' && <span>Ended on {tournament.endTime.toDate().toLocaleDateString()}</span>}
                         {(status === 'cancelled' || status === 'paused') && <span>Status: {status}</span>}
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
                <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Ticket className="h-4 w-4" /> Entry Fee</span>
                    <span className="font-semibold">₹{tournament.entryFee}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Trophy className="h-4 w-4" /> Prize Pool</span>
                    <span className="font-semibold">₹{tournament.prizePool}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4" /> Slots</span>
                    <span className="font-semibold">{tournament.filledSlots} / {tournament.totalSlots}</span>
                </div>
            </CardContent>
            <CardFooter>
                {getAction()}
            </CardFooter>
        </Card>
    );
}

export default function TournamentsPage() {
    const firestore = useFirestore();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        setLoading(true);
        const tourneysRef = collection(firestore, 'tournaments');
        const q = query(tourneysRef, orderBy('startTime', 'desc')); 
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
            setTournaments(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    const upcomingTournaments = tournaments.filter(t => getTournamentStatus(t) === 'upcoming');
    const liveTournaments = tournaments.filter(t => getTournamentStatus(t) === 'live');
    const completedTournaments = tournaments.filter(t => ['completed', 'cancelled', 'paused'].includes(getTournamentStatus(t)));

    const TournamentList = ({ list, emptyMessage }: { list: Tournament[] | null[], emptyMessage: string }) => {
        if (loading) {
            return (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {[...Array(3)].map((_, i) => <TournamentCard key={i} tournament={null} />)}
                </div>
            );
        }
        if (list.length === 0) {
            return <p className="text-center text-muted-foreground py-8">{emptyMessage}</p>
        }
        return (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {list.map(t => <TournamentCard key={t!.id} tournament={t} />)}
            </div>
        );
    }

  return (
    <div className="space-y-6">
        {bannerImage &&
            <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-6">
                <Image src={bannerImage.imageUrl} alt={bannerImage.description} fill className="object-cover" />
            </div>
        }

        <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upcoming">
                    <Calendar className="h-4 w-4 mr-2"/> Upcoming
                </TabsTrigger>
                <TabsTrigger value="live">
                    <CircleDotDashed className="h-4 w-4 mr-2"/> Live
                </TabsTrigger>
                <TabsTrigger value="completed">
                    <CheckCircle2 className="h-4 w-4 mr-2"/> Finished
                </TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming">
                <TournamentList list={upcomingTournaments} emptyMessage="No upcoming tournaments right now." />
            </TabsContent>
            <TabsContent value="live">
                 <TournamentList list={liveTournaments} emptyMessage="No live tournaments right now." />
            </TabsContent>
            <TabsContent value="completed">
                 <TournamentList list={completedTournaments} emptyMessage="No finished tournaments found." />
            </TabsContent>
        </Tabs>
    </div>
  );
}
