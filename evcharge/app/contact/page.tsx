"use client";

import { useMemo, useState } from "react";
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
  CheckCircle2,
} from "lucide-react";

const CONTACT_INFO = [
  {
    icon: Phone,
    title: "Phone",
    detail: "078-188-8084",
    sub: "Mon-Fri, 9am-6pm",
  },
  {
    icon: Mail,
    title: "Email",
    detail: "navindupuswella@gmail.com",
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
    sub: "9:00 AM - 5:00 PM",
  },
];

const CONTACT_CHANNELS = [
  {
    icon: Headphones,
    title: "24/7 EV Assistance",
    desc: "Stranded or need urgent help? Call our emergency hotline anytime.",
    action: "078-188-8084-EV-HELP",
  },
  {
    icon: MessageSquare,
    title: "Live Chat",
    desc: "Chat with our support team in real-time during business hours.",
    action: "Available Mon-Sat, 9am-5pm",
  },
  {
    icon: Building,
    title: "Station Owner Partnership",
    desc: "Interested in listing your charging station on our platform?",
    action: "partners@evcharge.com",
  },
];

const MAX_MESSAGE_WORDS = 120;
const MAX_SUBJECT_LENGTH = 100;
const NAME_REGEX = /^[A-Za-z][A-Za-z\s'.-]*$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormValues = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type FormErrors = FormValues;

const INITIAL_FORM: FormValues = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

const INITIAL_ERRORS: FormErrors = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

const INITIAL_TOUCHED: Record<keyof FormValues, boolean> = {
  name: false,
  email: false,
  subject: false,
  message: false,
};

function countWords(value: string): number {
  const words = value.trim().match(/\S+/g);
  return words ? words.length : 0;
}

function normalizeSingleLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function validateForm(values: FormValues): FormErrors {
  const errors: FormErrors = { ...INITIAL_ERRORS };
  const normalizedName = normalizeSingleLine(values.name);
  const normalizedEmail = normalizeSingleLine(values.email);
  const normalizedSubject = normalizeSingleLine(values.subject);
  const normalizedMessage = values.message.trim();
  const messageWords = countWords(normalizedMessage);

  if (!normalizedName) {
    errors.name = "Name is required.";
  } else if (normalizedName.length < 2) {
    errors.name = "Name must be at least 2 characters.";
  } else if (!NAME_REGEX.test(normalizedName)) {
    errors.name = "Name contains invalid symbols.";
  }

  if (!normalizedEmail) {
    errors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(normalizedEmail)) {
    errors.email = "Please enter a valid email address.";
  }

  if (!normalizedSubject) {
    errors.subject = "Subject is required.";
  } else if (normalizedSubject.length < 3) {
    errors.subject = "Subject must be at least 3 characters.";
  } else if (normalizedSubject.length > MAX_SUBJECT_LENGTH) {
    errors.subject = `Subject must be ${MAX_SUBJECT_LENGTH} characters or less.`;
  } else if (!/[A-Za-z0-9]/.test(normalizedSubject)) {
    errors.subject = "Please add a meaningful subject.";
  }

  if (!normalizedMessage) {
    errors.message = "Message is required.";
  } else if (messageWords > MAX_MESSAGE_WORDS) {
    errors.message = "Message must be 120 words or less.";
  }

  return errors;
}

export default function ContactPage() {
  const [formData, setFormData] = useState<FormValues>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>(INITIAL_ERRORS);
  const [touched, setTouched] = useState<Record<keyof FormValues, boolean>>(INITIAL_TOUCHED);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const liveErrors = useMemo(() => validateForm(formData), [formData]);
  const messageWordCount = useMemo(() => countWords(formData.message), [formData.message]);
  const isFormValid = useMemo(
    () => Object.values(liveErrors).every((value) => value === ""),
    [liveErrors]
  );

  const handleFieldChange = (field: keyof FormValues, value: string) => {
    const nextValue =
      field === "subject" ? value.slice(0, MAX_SUBJECT_LENGTH + 30) : value;

    setFormData((prev) => ({ ...prev, [field]: nextValue }));

    if (touched[field] || submitAttempted) {
      const nextForm = { ...formData, [field]: nextValue };
      setErrors(validateForm(nextForm));
    }
  };

  const handleBlur = (field: keyof FormValues) => {
    const normalizedValue =
      field === "message"
        ? formData[field].trim()
        : normalizeSingleLine(formData[field]);

    const nextForm = { ...formData, [field]: normalizedValue };
    setFormData(nextForm);
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validateForm(nextForm));
  };

  const getFieldClassName = (field: keyof FormValues) => {
    const shouldShowState = touched[field] || submitAttempted;
    const hasError = shouldShowState && Boolean(errors[field]);

    if (hasError) {
      return "border-red-500/80 focus-visible:ring-red-500/40";
    }

    if (shouldShowState && !errors[field] && formData[field].trim()) {
      return "border-green-600/50 focus-visible:ring-green-600/30";
    }

    return "border-slate-200 focus-visible:ring-primary/30";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setTouched({
      name: true,
      email: true,
      subject: true,
      message: true,
    });

    const normalizedForm: FormValues = {
      name: normalizeSingleLine(formData.name),
      email: normalizeSingleLine(formData.email),
      subject: normalizeSingleLine(formData.subject),
      message: formData.message.trim(),
    };
    const nextErrors = validateForm(normalizedForm);
    setFormData(normalizedForm);
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      toast.error("Please fix the form errors before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedForm),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) {
          setErrors((prev) => ({ ...prev, ...data.fieldErrors }));
        }
        toast.error(data.error || "Failed to send message");
        return;
      }

      setSubmitted(true);
      toast.success("Your message has been sent successfully.");
      setTimeout(() => {
        setSubmitted(false);
        setFormData(INITIAL_FORM);
        setErrors(INITIAL_ERRORS);
        setTouched(INITIAL_TOUCHED);
        setSubmitAttempted(false);
      }, 3000);
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fbf8] via-white to-[#f7faf8]">
      <section className="relative overflow-hidden border-b bg-slate-950 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url('https://futureenergy.com/wp-content/uploads/2021/06/BlogHeader-4-copy.png')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/55 via-slate-950/70 to-slate-950/95" />
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

      <section className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CONTACT_INFO.map(({ icon: Icon, title, detail, sub }) => (
              <Card key={title} className="border border-slate-200 bg-white shadow-sm">
                <CardContent className="p-5 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
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

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-5 lg:items-start">
            <Card className="overflow-hidden border border-slate-200 bg-white shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] lg:col-span-3">
              <CardContent className="p-6 sm:p-9">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
                  Contact Form
                </p>
                <h2 className="mb-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Send us a message
                </h2>
                <p className="mb-7 text-sm text-slate-600">
                  Tell us what you need and our support team will respond shortly.
                </p>

                {submitted ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-green-200 bg-green-50 py-12 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-green-600 text-white shadow-sm">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h3 className="mb-1 text-lg font-semibold text-slate-900">Message sent</h3>
                    <p className="max-w-sm text-sm text-slate-600">
                      Your message has been sent successfully. We&apos;ll get back to you soon.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Name
                        </label>
                        <Input
                          placeholder="Your name"
                          value={formData.name}
                          onChange={(e) => handleFieldChange("name", e.target.value)}
                          onBlur={() => handleBlur("name")}
                          aria-invalid={Boolean(errors.name)}
                          className={`h-11 rounded-xl border bg-white text-slate-900 shadow-sm transition-colors ${getFieldClassName("name")}`}
                        />
                        {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Email
                        </label>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          value={formData.email}
                          onChange={(e) => handleFieldChange("email", e.target.value)}
                          onBlur={() => handleBlur("email")}
                          aria-invalid={Boolean(errors.email)}
                          className={`h-11 rounded-xl border bg-white text-slate-900 shadow-sm transition-colors ${getFieldClassName("email")}`}
                        />
                        {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email}</p> : null}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Subject</label>
                      <Input
                        placeholder="How can we help?"
                        value={formData.subject}
                        onChange={(e) => handleFieldChange("subject", e.target.value)}
                        onBlur={() => handleBlur("subject")}
                        aria-invalid={Boolean(errors.subject)}
                        maxLength={MAX_SUBJECT_LENGTH + 30}
                        className={`h-11 rounded-xl border bg-white text-slate-900 shadow-sm transition-colors ${getFieldClassName("subject")}`}
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        {formData.subject.trim().length} / {MAX_SUBJECT_LENGTH} characters
                      </p>
                      {errors.subject ? <p className="mt-1 text-xs text-red-600">{errors.subject}</p> : null}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Message</label>
                      <Textarea
                        placeholder="Tell us more about your inquiry..."
                        rows={5}
                        value={formData.message}
                        onChange={(e) => handleFieldChange("message", e.target.value)}
                        onBlur={() => handleBlur("message")}
                        aria-invalid={Boolean(errors.message)}
                        className={`min-h-[150px] rounded-xl border bg-white text-slate-900 shadow-sm transition-colors ${getFieldClassName("message")}`}
                      />
                      <p
                        className={`mt-1 text-xs ${
                          messageWordCount > MAX_MESSAGE_WORDS ? "text-red-600" : "text-slate-500"
                        }`}
                      >
                        {messageWordCount} / {MAX_MESSAGE_WORDS} words
                      </p>
                      {errors.message ? <p className="mt-1 text-xs text-red-600">{errors.message}</p> : null}
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      className="h-12 w-full gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={submitting || !isFormValid}
                    >
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
                <Card key={title} className="border border-slate-200 bg-white shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
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

              <Card className="border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm">
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
