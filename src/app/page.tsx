
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Shield, Trophy, Users, Star, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const Feature = ({ icon, title, description }: { icon: React.ElementType, title: string, description: string }) => {
  const Icon = icon;
  return (
    <div className="flex items-start gap-4">
      <div className="bg-primary/10 text-primary p-3 rounded-full">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

const FAQItem = ({ question, answer }: { question: string, answer: string }) => (
    <div className="border-b py-4">
        <h4 className="font-semibold text-lg">{question}</h4>
        <p className="text-muted-foreground mt-2">{answer}</p>
    </div>
)

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground">
      {/* Hero Section */}
      <section className="py-20 md:py-32 text-center bg-gradient-to-b from-background to-muted/50">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-gradient-primary">
            Ludo League – Play Online Ludo & Join Competitive Matches
          </h1>
          <p className="mt-4 text-lg md:text-xl max-w-3xl mx-auto text-muted-foreground">
            The ultimate platform for Ludo enthusiasts. Join thousands of players in fair, secure, and exciting online Ludo matches. Turn your skills into winnings.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/signup">Get Started <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* What is Ludo League? */}
      <section id="about" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold">What is Ludo League?</h2>
            <p className="mt-4 text-muted-foreground">
              Ludo League is more than just a game; it&apos;s a competitive online platform where your Ludo skills are put to the test. We provide a fair and secure environment for players to compete in matches, join tournaments, and win real rewards. Our automated systems ensure quick gameplay, transparent results, and secure transactions, making us the go-to destination for serious Ludo players in India. Whether you are a casual player looking for fun or a seasoned pro aiming for the top, Ludo League offers an unparalleled gaming experience.
            </p>
          </div>
        </div>
      </section>

       {/* How to Play Section */}
      <section id="how-to-play" className="py-16 md:py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">How to Play Ludo League Online</h2>
            <p className="mt-4 text-muted-foreground">Get started in a few simple steps.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">1</div>
              <h3 className="text-xl font-semibold">Register & Deposit</h3>
              <p className="text-muted-foreground mt-2">Create your account, complete a quick KYC, and add funds to your wallet securely.</p>
            </div>
             <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">2</div>
              <h3 className="text-xl font-semibold">Join a Match</h3>
              <p className="text-muted-foreground mt-2">Choose your entry fee from the lobby and get matched with an opponent instantly.</p>
            </div>
             <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">3</div>
              <h3 className="text-xl font-semibold">Play & Win</h3>
              <p className="text-muted-foreground mt-2">Play on the Ludo King app, submit your result screenshot, and see your winnings credited automatically.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Features of Ludo League</h2>
            <p className="mt-4 text-muted-foreground">Everything you need for a competitive and enjoyable Ludo experience.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Feature icon={Users} title="Instant Matchmaking" description="Our smart lobby finds and matches you with players of a similar skill level in seconds."/>
            <Feature icon={Trophy} title="Automated Results & Payouts" description="Submit your result screenshot, and our system automatically verifies it and distributes the prize pool." />
            <Feature icon={Shield} title="Fair Play & Secure Platform" description="We use advanced fraud detection to ensure every match is fair. Your data and wallet are always secure."/>
            <Feature icon={Check} title="Hassle-free KYC" description="A simple and quick KYC process allows you to start playing and withdrawing your winnings with ease." />
            <Feature icon={Star} title="Daily Bonuses & Tasks" description="Stay engaged with daily login bonuses and complete missions to earn extra rewards in your wallet." />
            <Feature icon={Users} title="Community & Tournaments" description="Join community forums and participate in large-scale tournaments for even bigger prize pools." />
          </div>
        </div>
      </section>

      {/* Fair Play Section */}
       <section id="fair-play" className="py-16 md:py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold">Fair Play & Secure Platform</h2>
            <p className="mt-4 text-muted-foreground">
              At Ludo League, fairness and security are our top priorities. Our platform is built on a foundation of trust. We employ state-of-the-art fraud detection algorithms that analyze screenshot data and user behavior to prevent cheating. Duplicate screenshots or any form of result manipulation are automatically flagged for review. All transactions are processed through secure gateways, and your personal information is protected with industry-standard encryption. Play with peace of mind, knowing that you are on a platform that values integrity above all.
            </p>
          </div>
        </div>
      </section>

       {/* FAQ Section */}
      <section id="faq" className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl">
           <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h2>
          </div>
          <FAQItem
            question="Is Ludo League legal in India?"
            answer="Yes, Ludo League operates as a skill-based gaming platform, which is legal in most states in India. Players use their strategic skills to compete, making it a game of skill."
          />
           <FAQItem
            question="How are winnings distributed?"
            answer="After a match is completed and results are verified by our automated system, the prize pool is instantly distributed. The winner's wallet is credited, and the entry fee is deducted from the loser's wallet."
          />
           <FAQItem
            question="What happens if there is a dispute?"
            answer="If there is a conflict in the results submitted by players, the match is automatically flagged for review by our admin team. They will analyze the evidence and make a final decision. This ensures fairness for all players involved."
          />
           <FAQItem
            question="How long does withdrawal take?"
            answer="Withdrawal requests are typically processed within 24 hours. You must have a verified KYC to be eligible for withdrawals."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center gap-6 mb-4">
            <Link href="/about" className="text-sm text-muted-foreground hover:text-primary">About Us</Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary">Contact</Link>
            <Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary">Privacy Policy</Link>
            <Link href="/terms-and-conditions" className="text-sm text-muted-foreground hover:text-primary">Terms & Conditions</Link>
            <Link href="/tutorials" className="text-sm text-muted-foreground hover:text-primary">How to Play</Link>
          </div>
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Ludo League. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
