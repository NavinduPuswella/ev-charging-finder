"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  Headphones,
  Building,
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
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send message");
        return;
      }

      setSubmitted(true);
      toast.success("Message sent successfully");
      setTimeout(() => {
        setSubmitted(false);
        setFormData({ name: "", email: "", subject: "", message: "" });
      }, 3000);
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden border-b bg-slate-950 text-white">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/70 to-slate-950/95" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-28 sm:px-6 lg:px-8">
          <span className="mb-4 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-white">
            Contact
          </span>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
            Let&apos;s talk about your charging experience
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-white/80 sm:text-base">
            Have a question, feedback, or a support request? Our team is here to help.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-white/80 sm:text-sm">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">Fast replies</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">Human support</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">Mon-Sat coverage</span>
          </div>
        </div>
      </section>

      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CONTACT_INFO.map(({ icon: Icon, title, detail, sub }) => (
              <Card key={title} className="border bg-slate-50 shadow-none">
                <CardContent className="p-5 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg border bg-white text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  <p className="mt-1 text-sm font-medium text-foreground">{detail}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="border bg-white shadow-none lg:col-span-3">
              <CardContent className="p-6 sm:p-8">
                <p className="mb-2 text-sm font-semibold text-primary">Contact Form</p>
                <h2 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">
                  Send us a message
                </h2>

                {submitted ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border bg-slate-50 py-12 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg border bg-white text-primary">
                      <Send className="h-6 w-6" />
                    </div>
                    <h3 className="mb-1 text-lg font-semibold text-foreground">Message sent</h3>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      Thanks for reaching out. We&apos;ll get back to you as soon as possible.
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
                    <Button type="submit" size="lg" className="w-full gap-2 text-base" disabled={submitting}>
                      <Send className="h-4 w-4" />
                      {submitting ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4 lg:col-span-2">
              <div className="mb-2">
                <p className="mb-2 text-sm font-semibold text-primary">Support Channels</p>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Other ways to reach us
                </h2>
              </div>

              {CONTACT_CHANNELS.map(({ icon: Icon, title, desc, action }) => (
                <Card key={title} className="border bg-white shadow-none">
                  <CardContent className="p-5">
                    <div className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-slate-50 text-primary">
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

              <Card className="border bg-white shadow-none">
                <CardContent className="p-5">
                  <h3 className="mb-2 text-base font-semibold text-foreground">
                    Looking for a station right now?
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Browse nearby chargers and reserve your slot in minutes.
                  </p>
                  <Link href="/stations">
                    <Button variant="outline" className="gap-2">
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
