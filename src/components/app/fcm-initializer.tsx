
'use client';

import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '@/firebase/config'; // Assuming messaging is initialized here
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth'; // To get the current user
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/config'; // Your firestore instance

export function FcmInitializer() {
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const initializeFcm = async () => {
      if (!messaging || !user) return;

      // 1. Request permission
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Notification permission not granted.');
          return;
        }

        // 2. Get FCM Token
        const fcmToken = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });

        if (fcmToken) {
          // 3. Store the token in Firestore
          console.log('FCM Token:', fcmToken);
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, { fcmToken }, { merge: true });
        } else {
          console.log('No registration token available. Request permission to generate one.');
        }
      } catch (error) {
        console.error('An error occurred while retrieving token. ', error);
      }
    };

    initializeFcm();

    // 4. Handle foreground messages
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received. ', payload);
      // Show a toast notification
      toast({
        title: payload.notification?.title || 'New Notification',
        description: payload.notification?.body || '',
      });
    });

    return () => {
      unsubscribe(); // Unsubscribe from the onMessage event
    };
  }, [user, toast]);

  return null; // This component doesn't render anything
}
