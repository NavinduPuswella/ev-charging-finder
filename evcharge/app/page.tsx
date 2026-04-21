import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  CalendarCheck,
  Route,
  Star,
  ArrowRight,
  Battery,
  Clock,
  ShieldCheck,
  Leaf,
  Zap,
  CheckCircle2,
  Globe,
  Users,
  BarChart3,
} from "lucide-react";
import { SupportedVehiclesPills } from "@/components/supported-vehicles-pills";

const FEATURES = [
  {
    icon: MapPin,
    title: "Find Stations",
    desc: "Search by city, distance, or charger type. View stations on an interactive map with real-time data.",
  },
  {
    icon: CalendarCheck,
    title: "Book Slots",
    desc: "Reserve charging slots in advance. No more driving around hoping for an open charger.",
  },
  {
    icon: Route,
    title: "Trip Planner",
    desc: "Plan long-distance routes with AI-recommended charging stops tailored to your vehicle range.",
  },
  {
    icon: Battery,
    title: "Vehicle Management",
    desc: "Add your EVs with battery capacity and range details for personalized recommendations.",
  },
  {
    icon: Star,
    title: "Reviews & Ratings",
    desc: "Read reviews from verified users and share your own charging experience.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Stations",
    desc: "Every station is vetted and monitored for reliability, safety, and accurate availability data.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Search",
    desc: "Enter your location or destination to find charging stations nearby.",
  },
  {
    num: "02",
    title: "Compare",
    desc: "View pricing, availability, ratings, and charger types side by side.",
  },
  {
    num: "03",
    title: "Book & Charge",
    desc: "Reserve your slot, pay securely, and charge your EV without the wait.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      <section className="relative w-full min-h-[640px] h-screen max-h-[900px] overflow-hidden flex items-center">
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
        <div className="absolute inset-0 bg-black/65" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            

            <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.05]">
              Find. Book.
              <br />
              <span className="text-green-400">Charge.</span>
            </h1>

            <p className="mt-6 text-lg text-white/60 max-w-lg leading-relaxed">
              Discover nearby charging stations, reserve slots instantly, and plan your EV trips all in one place.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/stations">
                <Button size="lg" className="h-13 gap-2.5 text-base px-7 rounded-xl">
                  <MapPin className="h-5 w-5" />
                  Find Stations
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-13 gap-2.5 text-base px-7 rounded-xl border-white/20 text-white bg-white/5 backdrop-blur-sm"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mb-16">
            <p className="text-sm font-semibold text-primary mb-3">Platform Features</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Everything you need to charge with confidence
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              A complete toolkit for EV owners from finding the right station to managing your entire charging workflow.
            </p>
          </div>

          <div className="grid gap-px bg-border md:grid-cols-2 lg:grid-cols-3 rounded-2xl overflow-hidden border border-border">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white p-8 lg:p-10">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-5">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-28 bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <p className="text-sm font-semibold text-primary mb-3">How It Works</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Start charging in 3 simple steps
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="relative">
                <span className="text-7xl font-black text-primary/10 leading-none">{num}</span>
                <div className="mt-4">
                  <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold text-primary mb-3">Why ChargeX</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                The smarter way to keep your EV moving
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed max-w-lg">
                No more range anxiety. ChargeX gives you real time data, smart recommendations, and guaranteed charging slots wherever you go.
              </p>

              <div className="mt-10 space-y-5">
                {[
                  { icon: Zap, text: "Real-time availability across all stations" },
                  { icon: ShieldCheck, text: "Verified station quality with user reviews" },
                  { icon: Leaf, text: "AI-powered trip planning for any destination" },
                  { icon: Globe, text: "Growing network across Sri Lanka" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-foreground leading-relaxed">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-muted/30 p-8">
                <p className="text-sm font-semibold text-primary mb-4">Supported Vehicles</p>
                <SupportedVehiclesPills />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="rounded-2xl border border-border bg-white p-6">
                  <Users className="h-5 w-5 text-primary mb-3" />
                  <p className="text-2xl font-extrabold text-foreground">10+</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Active EV drivers</p>
                </div>
                <div className="rounded-2xl border border-border bg-white p-6">
                  <BarChart3 className="h-5 w-5 text-primary mb-3" />
                  <p className="text-2xl font-extrabold text-foreground">99.8%</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Station uptime</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-28 bg-muted/40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          

          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Ready to charge smarter?
          </h2>

          <p className="mt-5 text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Join thousands of EV drivers who book their charging sessions ahead of time. Sign up free and take control of your charging experience.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["No credit card required", "Free for drivers", "Cancel anytime"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                {item}
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row justify-center">
            <Link href="/sign-up">
              <Button size="lg" className="h-13 gap-2 rounded-xl text-base px-8">
                Create Free Account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/stations">
              <Button size="lg" variant="outline" className="h-13 gap-2 rounded-xl text-base px-8">
                Browse Stations
                <MapPin className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 py-16 md:grid-cols-4">
            <div className="md:col-span-1">
              <span className="text-lg font-bold">
                <span className="text-foreground">Charge</span>
                <span className="text-green-600">X</span>
              </span>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Sri Lanka&apos;s smartest EV charging platform. Find, book, and charge  effortlessly.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Product</p>
              <div className="flex flex-col gap-3">
                <Link href="/stations" className="text-sm text-foreground">Find Stations</Link>
                <Link href="/trip-planner" className="text-sm text-foreground">Trip Planner</Link>
                <Link href="/dashboard" className="text-sm text-foreground">Dashboard</Link>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Company</p>
              <div className="flex flex-col gap-3">
                <Link href="/contact" className="text-sm text-foreground">Contact</Link>
               
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Legal</p>
              <div className="flex flex-col gap-3">
                <span className="text-sm text-foreground">Privacy Policy</span>
                <span className="text-sm text-foreground">Terms of Service</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 border-t border-border py-8 md:flex-row md:justify-between">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>&copy; 2026 ChargeX. All rights reserved.</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/stations">Stations</Link>
              <Link href="/trip-planner">Trip Planner</Link>
              <Link href="/sign-in">Sign In</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
