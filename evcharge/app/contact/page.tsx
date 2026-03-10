"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Aurora from "@/components/Aurora";
import {
    Zap,
    Mail,
    Phone,
    MapPin,
    Clock,
    Send,
    MessageSquare,
    Headphones,
    Building,
} from "lucide-react";

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
        // In a real app, this would send to an API
        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            setFormData({ name: "", email: "", subject: "", message: "" });
        }, 3000);
    };

    return (
        <div className="flex flex-col">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-black min-h-[350px] flex items-center justify-center">
                {/* Aurora Background */}
                <div className="absolute inset-0 z-0">
                    <Aurora
                        colorStops={["#7cff67", "#ff1ad5", "#2986ff"]}
                        blend={0.5}
                        amplitude={1.0}
                        speed={1}
                    />
                </div>
                {/* Dark overlay for text readability */}
                <div className="absolute inset-0 bg-black/30 z-[1]" />
                <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 text-center">
                    <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                        Get in <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Touch</span>
                    </h1>
                    <p className="mt-6 text-lg leading-8 text-white/70 max-w-3xl mx-auto">
                        Have questions, feedback, or need support? We&apos;d love to hear
                        from you. Our team is here to help.
                    </p>
                </div>
            </section>

            {/* Contact Info Cards */}
            <section className="py-16 bg-white">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {[
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
                                sub: "Colombo Greater, SriLanka",
                            },
                            {
                                icon: Clock,
                                title: "Working Hours",
                                detail: "Mon - Sat",
                                sub: "9:00 AM - 6:00 PM",
                            },
                        ].map(({ icon: Icon, title, detail, sub }) => (
                            <Card
                                key={title}
                                className="group border-border/50 hover:border-primary/30 transition-all duration-300"
                            >
                                <CardContent className="p-6 text-center">
                                    <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-1">{title}</h3>
                                    <p className="text-sm font-medium text-foreground">
                                        {detail}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact Form + Support Options */}
            <section className="py-20 bg-gradient-to-b from-green-50/50 to-white">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid gap-12 lg:grid-cols-2">
                        {/* Contact Form */}
                        <Card className="border-border/50">
                            <CardContent className="p-8">
                                <h2 className="text-2xl font-bold mb-6">Send us a Message</h2>
                                {submitted ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                                            <Send className="h-8 w-8" />
                                        </div>
                                        <h3 className="text-xl font-semibold mb-2">
                                            Message Sent!
                                        </h3>
                                        <p className="text-muted-foreground">
                                            Thank you for reaching out. We&apos;ll get back to you
                                            soon.
                                        </p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        <div className="grid gap-5 sm:grid-cols-2">
                                            <div>
                                                <label className="text-sm font-medium mb-1.5 block">
                                                    Name
                                                </label>
                                                <Input
                                                    placeholder="Your name"
                                                    value={formData.name}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, name: e.target.value })
                                                    }
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium mb-1.5 block">
                                                    Email
                                                </label>
                                                <Input
                                                    type="email"
                                                    placeholder="your@email.com"
                                                    value={formData.email}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, email: e.target.value })
                                                    }
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-1.5 block">
                                                Subject
                                            </label>
                                            <Input
                                                placeholder="How can we help?"
                                                value={formData.subject}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, subject: e.target.value })
                                                }
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-1.5 block">
                                                Message
                                            </label>
                                            <Textarea
                                                placeholder="Tell us more about your inquiry..."
                                                rows={5}
                                                value={formData.message}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, message: e.target.value })
                                                }
                                                required
                                            />
                                        </div>
                                        <Button type="submit" size="lg" className="w-full gap-2">
                                            <Send className="h-4 w-4" />
                                            Send Message
                                        </Button>
                                    </form>
                                )}
                            </CardContent>
                        </Card>

                        {/* Support Options */}
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold">Other Ways to Reach Us</h2>
                            <div className="space-y-4">
                                {[
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
                                ].map(({ icon: Icon, title, desc, action }) => (
                                    <Card
                                        key={title}
                                        className="border-border/50 hover:border-primary/30 transition-all duration-300"
                                    >
                                        <CardContent className="p-6">
                                            <div className="flex gap-4">
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                    <Icon className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold mb-1">{title}</h3>
                                                    <p className="text-sm text-muted-foreground mb-2">
                                                        {desc}
                                                    </p>
                                                    <span className="text-sm font-medium text-primary">
                                                        {action}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
