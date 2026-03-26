"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  Headphones,
  Building,
  Zap,
  ArrowRight,
} from "lucide-react";

const CONTACT_INFO = [
  {
    icon: Phone,
    title: "Phone",
    detail: "078-1888-084",
    sub: "Mon-Fri, 9am-6pm",
  },
  {
    icon: Mail,
    title: "Email",
    detail: "support@evcharge.com",
    sub: "We reply within 24h",
  },
  {
    icon: MapPin,
    title: "Office",
    detail: "Pitipana Junction, Homagama",
    sub: "Colombo Greater, Sri Lanka",
  },
  {
    icon: Clock,
    title: "Working Hours",
    detail: "Mon - Sat",
    sub: "9:00 AM - 6:00 PM",
  },
];

const CONTACT_CHANNELS = [
  {
    icon: Headphones,
    title: "24/7 EV Assistance",
    desc: "Stranded or need urgent help? Call our emergency hotline anytime.",
    action: "078-1888-084-EV-HELP",
  },
  {
    icon: MessageSquare,
    title: "Live Chat",
    desc: "Chat with our support team in real-time during business hours.",
    action: "Available Mon-Sat, 9am-6pm",
  },
  {
    icon: Building,
    title: "Station Owner Partnership",
    desc: "Interested in listing your charging station on our platform?",
    action: "partners@evcharge.com",
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 3000);
  };

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden bg-foreground min-h-[420px] flex items-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.28),transparent_38%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.1),transparent_35%),linear-gradient(180deg,rgba(0,0,0,0.35),rgba(0,0,0,0.72))]" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 sm:py-28 lg:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur-sm mb-6">
              <Zap className="h-3.5 w-3.5 text-green-400" />
              We are here to help
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.05]">
              Let&apos;s Talk
              <br />
              <span className="text-green-400">About EVCharge.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-white/70 max-w-xl">
              Have questions, feedback, or need support with charging or bookings?
              Our team is ready to help you quickly.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/70">
              <span className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5">
                Fast replies
              </span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5">
                Human support
              </span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5">
                Mon-Sat coverage
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
            {CONTACT_INFO.map(({ icon: Icon, title, detail, sub }) => (
              <div key={title} className="bg-white p-7 text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1 text-base font-semibold text-foreground">{title}</h3>
                <p className="text-sm font-medium text-foreground">{detail}</p>
                <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-5">
            <Card className="lg:col-span-3 rounded-2xl border-border shadow-sm">
              <CardContent className="p-8 sm:p-10">
                <p className="text-sm font-semibold text-primary mb-2">Contact Form</p>
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground mb-6">
                  Send us a Message
                </h2>
                {submitted ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Send className="h-7 w-7" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-foreground">Message Sent!</h3>
                    <p className="max-w-sm text-muted-foreground">
                      Thank you for reaching out. We&apos;ll get back to you soon.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">Name</label>
                        <Input
                          placeholder="Your name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">Email</label>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Subject</label>
                      <Input
                        placeholder="How can we help?"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Message</label>
                      <Textarea
                        placeholder="Tell us more about your inquiry..."
                        rows={5}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" size="lg" className="w-full gap-2 rounded-xl text-base">
                      <Send className="h-4 w-4" />
                      Send Message
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-4">
              <div className="mb-2">
                <p className="text-sm font-semibold text-primary mb-2">Support Channels</p>
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                  Other Ways to Reach Us
                </h2>
              </div>
              {CONTACT_CHANNELS.map(({ icon: Icon, title, desc, action }) => (
                <Card key={title} className="rounded-2xl border-border">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="mb-1 font-semibold text-foreground">{title}</h3>
                        <p className="mb-2 text-sm text-muted-foreground">{desc}</p>
                        <span className="text-sm font-medium text-primary">{action}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card className="rounded-2xl border-border bg-muted/30">
                <CardContent className="p-6">
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    Looking for a station now?
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    Browse nearby chargers and reserve your slot in minutes.
                  </p>
                  <Link href="/stations">
                    <Button variant="outline" className="gap-2 rounded-xl">
                      Find Stations
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
