"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Zap,
  Sparkles,
  CheckCircle2,
  Mail,
  Gift,
  Rocket,
  Clock,
  Bell,
} from "lucide-react";
import { useState } from "react";

import { Container } from "@/components/container";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spotlight } from "@/components/ui/spotlight";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const benefits = [
  {
    icon: Bell,
    title: "Launch Notification",
    description: "Be the first to know when Ekinox goes live",
  },
  {
    icon: Gift,
    title: "Exclusive Discount Code",
    description: "Get a special promo code reserved for early supporters",
  },
  {
    icon: Zap,
    title: "Early Access to Beta",
    description: "Test features before anyone else",
  },
];

const features = [
  "Create AI agents in under 60 seconds",
  "No code required - just drag and drop",
  "Connect 100+ tools and services",
  "Automate complex workflows visually",
  "AI-powered recipe automation",
  "Email delivery and notifications",
];

export default function EkinoxPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      toast({
        variant: "destructive",
        title: "Invalid email",
        description: "Please enter a valid email address.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/ekinox/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join waitlist");
      }

      setIsSuccess(true);
      setEmail("");
      toast({
        title: "You're on the list! 🎉",
        description:
          "Check your email for confirmation. We'll notify you when Ekinox launches!",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Oops!",
        description:
          error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container className="relative mb-32 flex w-auto flex-col items-center justify-start space-y-16 pr-2 pt-8 sm:mb-40 sm:pr-11">
      <AnimatedGridPattern
        numSquares={80}
        maxOpacity={0.1}
        duration={1}
        className={cn(
          "[mask-image:radial-gradient(500px_circle_at_center,hsl(var(--secondary)),transparent)]",
          "inset-x-0 inset-y-[-20%] h-full skew-y-12 opacity-75",
        )}
      />
      <Spotlight
        className="-top-40 left-0 md:-top-20 md:left-60"
        fill="hsl(var(--primary))"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex w-full max-w-5xl flex-col items-center space-y-6 text-center"
      >
        <Badge variant="outline" className="mb-2 animate-pulse">
          <Sparkles className="mr-2 size-4" />
          Coming Soon
        </Badge>

        <h1 className="text-5xl font-bold tracking-tighter sm:text-6xl md:text-7xl">
          Building AI Agents Just Got{" "}
          <span className="text-primary">INSANELY Easy</span>
        </h1>

        <p className="max-w-3xl text-xl text-muted-foreground sm:text-2xl">
          Watch me create a fully automated AI recipe agent with email delivery
          in under <span className="font-bold text-primary">60 seconds</span>.
          No code. No complexity. Just pure AI magic. ✨
        </p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative w-full max-w-4xl overflow-hidden rounded-xl border border-border shadow-2xl"
        >
          {!videoError ? (
            <video
              className="w-full"
              controls
              controlsList="nodownload"
              playsInline
              preload="metadata"
              onError={(e) => {
                console.error("Video error:", e);
                setVideoError(true);
                toast({
                  variant: "destructive",
                  title: "Video loading issue",
                  description:
                    "The demo video couldn't be loaded. Please try refreshing the page.",
                });
              }}
            >
              <source
                src="https://xgnpnbpfiuevcmvx.public.blob.vercel-storage.com/demo.mp4"
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="flex min-h-[400px] items-center justify-center bg-secondary/50 p-8 text-center">
              <div>
                <p className="mb-4 text-lg font-semibold">
                  Video temporarily unavailable
                </p>
                <p className="text-muted-foreground">
                  We&apos;re working on it! The demo video will be available
                  soon.
                </p>
                <Button
                  onClick={() => setVideoError(false)}
                  className="mt-4"
                  variant="outline"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </motion.div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Badge variant="secondary" className="text-sm">
            <Rocket className="mr-2 size-4" />
            AI Workflow Automation
          </Badge>
          <Badge variant="secondary" className="text-sm">
            <Clock className="mr-2 size-4" />
            60 Second Setup
          </Badge>
          <Badge variant="secondary" className="text-sm">
            <Zap className="mr-2 size-4" />
            No Code Required
          </Badge>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 w-full max-w-4xl rounded-lg border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 p-8 sm:p-12"
      >
        <div className="mb-8 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Want Early Access + Exclusive Promo Code? 🎁
          </h2>
          <p className="text-lg text-muted-foreground">
            Join the waitlist and get notified when Ekinox launches
          </p>
        </div>

        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 pl-10 text-lg"
                  required
                />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="group h-14 text-lg font-semibold sm:w-auto"
              >
                {isLoading ? (
                  "Joining..."
                ) : (
                  <>
                    Get Early Access
                    <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-lg border border-primary/40 bg-primary/10 p-6 text-center"
          >
            <CheckCircle2 className="mx-auto mb-4 size-16 text-primary" />
            <h3 className="mb-2 text-2xl font-bold">You&apos;re In! 🎉</h3>
            <p className="text-muted-foreground">
              Check your inbox for a confirmation email. We&apos;ll notify you
              as soon as Ekinox launches!
            </p>
          </motion.div>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="text-center"
            >
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <benefit.icon className="size-6" />
              </div>
              <h3 className="mb-1 font-semibold">{benefit.title}</h3>
              <p className="text-sm text-muted-foreground">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="relative z-10 w-full max-w-4xl"
      >
        <h2 className="mb-8 text-center text-3xl font-bold tracking-tight sm:text-4xl">
          What You&apos;ll Be Able To Do
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 + index * 0.1 }}
              className="flex items-start gap-3 rounded-lg border border-border bg-secondary/50 p-4"
            >
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
              <span className="text-base">{feature}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="relative z-10 w-full max-w-3xl text-center"
      >
        <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
          The Future of AI Workflow Automation is Coming Soon
        </h2>
        <p className="mb-6 text-lg text-muted-foreground">
          And it&apos;s going to change everything.
        </p>
        <p className="text-sm text-muted-foreground">
          Who&apos;s ready to automate their life with AI? 🤖💪
        </p>
      </motion.div>
    </Container>
  );
}
