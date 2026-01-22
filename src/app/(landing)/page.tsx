
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Globe, Users, Cpu, ArrowRight, Smartphone } from "lucide-react";
import Link from "next/link";

const Feature = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => {
  return (
    <div className="flex flex-col items-center text-center p-4">
      <div className="bg-primary/10 text-primary p-4 rounded-full mb-4">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

const FAQItem = ({ question, answer }: { question: string, answer: string }) => (
    <div className="border-t py-6">
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
            Ludo League Online – Play Ludo League Games & Compete in Real Matches
          </h1>
          <p className="mt-4 text-lg md:text-xl max-w-3xl mx-auto text-muted-foreground">
            Welcome to Ludo League Online — the ultimate online destination for Ludo players who love real competition, strategy, and fun! At LudoLeague.online, you can play Ludo online against players from around the world, test your skills, and enjoy a seamless multiplayer gaming experience.
          </p>
           <p className="mt-4 text-lg md:text-xl max-w-3xl mx-auto text-muted-foreground">
            Whether you are a casual player or a competitive strategist, this platform brings you the classic Ludo game with an online twist that keeps you engaged and entertained.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/signup">Start Playing Now! <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* What is Ludo League? */}
      <section id="about" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold">What is Ludo League?</h2>
            <Card className="mt-6 text-left p-6 bg-card">
                 <p className="text-muted-foreground leading-relaxed">
                Ludo League is a modern online version of the traditional Ludo board game. It combines:
                </p>
                <ul className="mt-4 space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" /><span>Classic Ludo gameplay you know and love 🎲</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" /><span>Smooth online multiplayer matches 🌐</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" /><span>Strategic battles with real opponents 🧠</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" /><span>Easy-to-use interface for all devices 📱💻</span></li>
                </ul>
                 <p className="mt-4 text-muted-foreground leading-relaxed">
                At Ludo League Online, every match brings excitement, social interaction, and the opportunity to improve your skills. Best of all — it’s completely optimized for both beginners and advanced players.
                </p>
            </Card>
          </div>
        </div>
      </section>

       {/* How to Play Section */}
      <section id="how-to-play" className="py-16 md:py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">How to Play Ludo League Online</h2>
            <p className="mt-4 text-muted-foreground">Getting started on LudoLeague.online is simple:</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">1</div>
              <h3 className="text-xl font-semibold">Visit & Sign Up</h3>
              <p className="text-muted-foreground mt-2">Visit the site and sign up for a free account.</p>
            </div>
             <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">2</div>
              <h3 className="text-xl font-semibold">Choose a Game Mode</h3>
              <p className="text-muted-foreground mt-2">Choose a game mode from the lobby.</p>
            </div>
             <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">3</div>
              <h3 className="text-xl font-semibold">Match with Players</h3>
              <p className="text-muted-foreground mt-2">Invite friends or match with players from around the world.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">4</div>
              <h3 className="text-xl font-semibold">Play to Win!</h3>
              <p className="text-muted-foreground mt-2">Roll the dice, plan your moves, and beat your opponents!</p>
            </div>
          </div>
           <p className="text-center mt-8 text-muted-foreground">Our intuitive dashboard makes it easy to join games, track your performance, and manage your profile with ease.</p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Features of Ludo League Online</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
            <Feature icon={Users} title="Real Multiplayer Matches" description="Play with real users from all over the world — no bots, no fake players."/>
            <Feature icon={Smartphone} title="Device-Friendly Design" description="Works smoothly on desktop, tablet, and mobile devices."/>
            <Feature icon={Globe} title="Easy Navigation" description="Simple menus and clear buttons make gameplay intuitive for everyone." />
            <Feature icon={Cpu} title="Secure & Fair Gameplay" description="We prioritize a fair play environment so that every match is competitive and fun."/>
          </div>
        </div>
      </section>

      {/* Play Anytime Section */}
       <section id="anytime-anywhere" className="py-16 md:py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold">Play Ludo League Online Anytime, Anywhere</h2>
            <p className="mt-4 text-muted-foreground">
             With LudoLeague.online, you don’t need to install any apps. Just open the site in your browser and start playing instantly. Whether you’re on Android, iPhone, or a laptop, the experience is smooth and responsive.
            </p>
          </div>
        </div>
      </section>

       {/* Why Choose Section */}
      <section id="why-choose" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold">Why Choose LudoLeague.online?</h2>
             <Card className="mt-6 text-left p-6 bg-card">
                <p className="text-muted-foreground leading-relaxed">
                Ludo League Online stands out because:
                </p>
                <ul className="mt-4 space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" /><span>It’s 100% web-based — no downloads required</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" /><span>The UI is mobile optimized</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" /><span>It loads fast and works reliably</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" /><span>Search engines easily find and index your games</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" /><span>Players can enjoy classic Ludo with a modern interface</span></li>
                </ul>
            </Card>
          </div>
        </div>
      </section>

       {/* FAQ Section */}
      <section id="faq" className="py-16 md:py-24 bg-muted/50">
        <div className="container mx-auto px-4 max-w-4xl">
           <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h2>
          </div>
          <FAQItem
            question="Is Ludo League Online free to play?"
            answer="Yes! You can play for free and enjoy all basic features without payment."
          />
           <FAQItem
            question="Do I need to register?"
            answer="To play multiplayer matches, you’ll need to sign up with a username and email. This helps manage your games and profile safely."
          />
           <FAQItem
            question="Can I play on mobile?"
            answer="Absolutely! LudoLeague.online runs on all devices with modern web browsers."
          />
        </div>
      </section>
      
       {/* Call to Action Section */}
      <section className="py-20 md:py-32 text-center">
        <div className="container mx-auto px-4">
           <h2 className="text-3xl md:text-4xl font-bold">Start Playing Now!</h2>
          <p className="mt-4 text-lg md:text-xl max-w-3xl mx-auto text-muted-foreground">
           Are you ready to join the online Ludo community and challenge players in real matches?
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="/signup">Click PLAY NOW and jump into the Ludo League experience! <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center gap-6 mb-4 flex-wrap">
            <Link href="/about" className="text-sm text-muted-foreground hover:text-primary">About Us</Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary">Contact</Link>
            <Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary">Privacy Policy</Link>
            <Link href="/terms-and-conditions" className="text-sm text-muted-foreground hover:text-primary">Terms &amp; Conditions</Link>
            <Link href="/refund-policy" className="text-sm text-muted-foreground hover:text-primary">Refund Policy</Link>
            <Link href="/gst-policy" className="text-sm text-muted-foreground hover:text-primary">GST Policy</Link>
          </div>
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Ludo League. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
