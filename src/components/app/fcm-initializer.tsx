'use client';

import { useFcm } from "@/hooks/useFcm";

/**
 * This component's only purpose is to initialize the Firebase Cloud Messaging listener.
 * It's kept separate to avoid causing chunking issues in the main layout.
 */
export function FcmInitializer() {
    useFcm();
    return null;
}
