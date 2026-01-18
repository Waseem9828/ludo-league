'use client';
import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { useFirestore, useMessaging, useUser } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from './use-toast';

export const useFcm = () => {
    const { toast } = useToast();
    const messaging = useMessaging();
    const { user } = useUser();
    const firestore = useFirestore();

    useEffect(() => {
        if (typeof window === 'undefined' || !messaging || !user || !firestore) {
            return;
        }

        const setupMessaging = async () => {
            try {
                // Ensure the service worker is ready
                const swRegistration = await navigator.serviceWorker.ready;

                // Handle incoming messages
                onMessage(messaging, (payload) => {
                    console.log('Foreground Message received. ', payload);
                    toast({
                        title: payload.notification?.title,
                        description: payload.notification?.body,
                    });
                });

                // Request permission and get token
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    console.log('Notification permission granted.');
                    // Rely on the vapid key from the initial config passed to getMessaging.
                    // This is cleaner and avoids issues with env vars on the client.
                    const currentToken = await getToken(messaging, { 
                        serviceWorkerRegistration: swRegistration
                    });

                    if (currentToken) {
                        console.log('FCM Token:', currentToken);
                        const userProfileRef = doc(firestore, 'users', user.uid);
                        await setDoc(userProfileRef, { fcmToken: currentToken }, { merge: true });
                    } else {
                        console.log('No registration token available. Request permission to generate one.');
                    }
                } else {
                    console.log('Unable to get permission to notify.');
                }
            } catch (error) {
                console.error('An error occurred while setting up notifications.', error);
                 toast({
                    title: "Could not initialize notifications",
                    description: error instanceof Error ? error.message : "An unknown error occurred.",
                    variant: "destructive"
                });
            }
        };

        setupMessaging();

    }, [messaging, user, firestore, toast]);

    return null;
};
