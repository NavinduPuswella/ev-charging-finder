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
  Radar,
  ShieldCheck,
  Leaf,
  Gauge,
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

      {/* Charging Experience Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-green-50/60 via-white to-white py-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-green-300/30 blur-3xl" />
          <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-green-200/30 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="border-green-100 bg-white/90 shadow-xl backdrop-blur">
            <CardContent className="p-6 sm:p-10 lg:p-12">
              <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
                <div className="min-w-0">
                  
                  <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                    From route to recharge,
                    <span className="block text-green-700">everything feels effortless.</span>
                  </h2>
                  <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                    EVCharge removes charging friction with cleaner decisions, faster bookings, and dependable station choices.
                  </p>
                  <div className="mt-8">
                    <div className="rounded-xl border border-green-100 bg-white px-3 py-3">
                      <div className="w-full overflow-hidden">
                        <div className="animate-marquee flex min-w-max items-center gap-3">
                          {[
                            "Tesla Model 3",
                            "Nissan Leaf",
                            "Hyundai Ioniq 5",
                            "BYD Atto 3",
                            "Kia EV6",
                            "MG ZS EV",
                            "BMW i4",
                          ]
                            .concat([
                              "Tesla Model 3",
                              "Nissan Leaf",
                              "Hyundai Ioniq 5",
                              "BYD Atto 3",
                              "Kia EV6",
                              "MG ZS EV",
                              "BMW i4",
                            ])
                            .map((vehicle, index) => (
                              <span
                                key={`${vehicle}-${index}`}
                                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-green-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                              >
                                <Battery className="h-3.5 w-3.5 text-green-700" />
                                {vehicle}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Premium CTA Section */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Card className="relative overflow-hidden rounded-[2rem] border-green-200 bg-gradient-to-r from-white via-green-50 to-white shadow-2xl">
            <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-green-300/25 blur-3xl" />
            <div className="absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-green-200/30 blur-3xl" />
            <CardContent className="relative p-8 sm:p-10 lg:p-14">
              <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">
                    Start your better charging routine
                  </p>
                  <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                    Charge smarter,
                    <span className="block text-green-700">not harder.</span>
                  </h2>
                  <p className="mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
                    Set up your account once and manage every station search, booking, and charging stop with a cleaner workflow.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-4 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-white/80 px-3 py-1">
                      <Zap className="h-3.5 w-3.5 text-green-700" /> Faster bookings
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-white/80 px-3 py-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-green-700" /> Transparent station quality
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-white/80 px-3 py-1">
                      <Leaf className="h-3.5 w-3.5 text-green-700" /> Trip-ready charging plans
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <Link href="/sign-up" className="w-full">
                    <Button size="lg" className="w-full gap-2 bg-green-600 text-white hover:bg-green-700">
                      Create Free Account
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/stations" className="w-full">
                    <Button size="lg" variant="outline" className="w-full gap-2 border-green-300 text-green-700 hover:bg-green-50">
                      Browse Stations
                      <MapPin className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
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
