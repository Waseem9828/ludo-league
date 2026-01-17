# **App Name**: Ludo league

## Core Features:

- User Authentication: Secure registration and login using mobile OTP or email and password.
- Deposit Management: Users deposit funds via QR code, upload a payment screenshot, and enter the UTR number; admin approves or rejects deposit requests.
- Match Creation and Joining: Users create or join matches, paying an entry fee that locks their wallet balance; creator generates a Ludo King room code for participants.
- Result Submission and Verification: Players upload result screenshots, select their position (1st, 2nd, 3rd, 4th), and indicate win/loss status; the system cross-verifies screenshot data for consistency.
- Automated Fraud Detection: Detect duplicate screenshot uploads by identifying repeated hashes or screenshots used in multiple matches and flag for review; this tool employs algorithms to analyze screenshot image data to recognize fraud.
- Automated Payout System: Automatic distribution of winnings based on verified match results, crediting winners and deducting from losers; the system processes payouts only after all results are submitted and validated.
- Admin Fraud Dashboard: The Admin sees repeated fake screenshots, the same IP/Device users, suspicious win rates, and manual block/suspend options.

## Style Guidelines:

- Primary color: Vivid blue (#29ABE2) to evoke a sense of excitement and trust.
- Background color: Light blue (#D0EAF7), a lighter shade of the primary color to ensure that the screen elements have enough contrast while retaining visual cohesion.
- Accent color: Yellow-orange (#F2994A), for highlights and important action items, chosen because it is closely analogous to vivid blue.
- Body and headline font: 'Inter' sans-serif for a modern, neutral, and easily readable experience.
- Simple, geometric icons to represent game actions and status updates.
- Clean and intuitive layout with clear information hierarchy for easy navigation.
- Subtle transitions and animations for a smooth user experience when navigating and updating match status.