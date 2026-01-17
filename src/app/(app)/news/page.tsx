
'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Loader2, Newspaper } from 'lucide-react';
import type { News } from '@/lib/types';
import Image from "next/image";
import { PlaceHolderImages } from '@/lib/placeholder-images';

const bannerImage = PlaceHolderImages.find(img => img.id === 'news-banner');

export default function NewsPage() {
  const firestore = useFirestore();
  const [newsItems, setNewsItems] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;
    setLoading(true);
    const newsRef = collection(firestore, 'news');
    const q = query(newsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as News));
      setNewsItems(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching news: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore]);

  return (
    <div className="space-y-6">
      {bannerImage && (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-6">
          <Image src={bannerImage.imageUrl} alt={bannerImage.description} fill className="object-cover" />
        </div>
      )}
      <div className="flex items-center gap-3">
        <Newspaper className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Latest News & Announcements</h1>
      </div>
      
      {loading && (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}

      {!loading && newsItems.length === 0 && (
        <Card className="text-center py-16">
          <CardContent>
            <p className="text-muted-foreground">No news available right now. Please check back later!</p>
          </CardContent>
        </Card>
      )}

      {!loading && newsItems.length > 0 && (
        <div className="space-y-4">
          {newsItems.map(item => (
            <Card key={item.id} className="shadow-md">
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>
                  Posted by {item.authorName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{item.content}</p>
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground">
                {item.createdAt?.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
