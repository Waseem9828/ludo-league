
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, Shield } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-3xl">
            <Users className="h-8 w-8 text-primary" />
            About Ludo League
          </CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-full text-lg">
          <p>
            Ludo League was born from a simple idea: to create a fair, competitive, and exciting online platform for Ludo lovers across India. We saw a need for a space where strategic players could test their skills against real opponents and be rewarded for their expertise.
          </p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <Target className="h-6 w-6 text-primary"/>
                    Our Mission
                </CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-full">
                <p>Our mission is to be the most trusted and engaging platform for online Ludo in India. We are committed to providing a seamless gaming experience with instant matchmaking, automated result verification, and swift, secure payouts. We aim to build a thriving community of players who share a passion for the game and respect the spirit of fair competition.</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <Shield className="h-6 w-6 text-primary"/>
                    Our Commitment to Fair Play
                </CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-full">
                <p>Integrity is at the core of Ludo League. We have invested heavily in robust anti-fraud systems to detect and prevent any form of cheating. From verifying result screenshots to monitoring user behavior, we take every possible measure to ensure that every match is decided purely by skill. Your trust is our most valuable asset, and we work tirelessly to uphold it.</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
