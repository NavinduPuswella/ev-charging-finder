import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Zap,
  MapPin,
  CalendarCheck,
  Route,
  Star,
  ArrowRight,
  Battery,
  Clock,
  Users,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section - Full Screen */}
      <section className="relative w-full h-screen min-h-[600px] overflow-hidden flex items-center justify-center">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/hero-bg.png"
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        {/* Content */}
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-7xl drop-shadow-lg">
            Find & Book{" "}
            <span className="text-green-400">EV Charging</span>{" "}
            Stations Effortlessly
          </h1>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row justify-center">
            <Link href="/stations">
              <Button size="lg" className="gap-2 shadow-lg shadow-primary/25 text-base px-8 py-6">
                <MapPin className="h-5 w-5" />
                Find Stations
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button variant="outline" size="lg" className="gap-2 text-base px-8 py-6 border-white/30 text-white hover:bg-white/10 hover:text-white">
                Sign Up
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Everything You Need for{" "}
              <span className="text-primary">Smart Charging</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              From finding stations to planning trips — we&apos;ve got your EV charging covered.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: MapPin,
                title: "Find Stations",
                desc: "Search by city, distance, or charger type. View stations on an interactive map.",
              },
              {
                icon: CalendarCheck,
                title: "Book Slots",
                desc: "Reserve charging slots in advance. No more waiting in queues.",
              },
              {
                icon: Route,
                title: "Trip Planner",
                desc: "Plan your route and get AI-recommended charging stops based on your vehicle range.",
              },
              {
                icon: Battery,
                title: "Vehicle Management",
                desc: "Add your EVs with battery and range details for personalized recommendations.",
              },
              {
                icon: Star,
                title: "Reviews & Ratings",
                desc: "Read reviews from verified users and share your charging experience.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="group border-border/50 hover:border-primary/30 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-b from-green-50/50 to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              How It <span className="text-primary">Works</span>
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              { step: "01", icon: Users, title: "Sign Up", desc: "Create your free account in seconds" },
              { step: "02", icon: MapPin, title: "Find Station", desc: "Search and filter charging stations" },
              { step: "03", icon: CalendarCheck, title: "Book Slot", desc: "Select time and confirm booking" },
              { step: "04", icon: Zap, title: "Charge Up", desc: "Arrive and charge your EV" },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="text-center group">
                <div className="relative mx-auto mb-4">
                  <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 group-hover:scale-110 transition-transform">
                    <Icon className="h-7 w-7" />
                  </div>
                  <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background text-xs font-bold">
                    {step}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl">
            Ready to Charge Smarter?
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/80">
            Join thousands of EV owners who trust EVCharge for reliable charging.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row justify-center">
            <Link href="/sign-up">
              <Button size="lg" variant="secondary" className="gap-2 shadow-lg">
                Sign Up
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap className="h-4 w-4" />
              </div>
              <span className="font-bold">EVCharge</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/stations" className="hover:text-primary transition-colors">Stations</Link>
              <Link href="/trip-planner" className="hover:text-primary transition-colors">Trip Planner</Link>
              <Link href="/sign-in" className="hover:text-primary transition-colors">Sign In</Link>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>© 2026 EVCharge. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
