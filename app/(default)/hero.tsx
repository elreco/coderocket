"use client";
import {
  SiHtml5,
  SiReact,
  SiVuedotjs,
  SiSvelte,
  SiAngular,
  SiSupabase,
} from "@icons-pack/react-simple-icons";
import { motion } from "framer-motion";
import {
  Terminal,
  Paintbrush,
  Globe,
  Lock,
  WandSparkles,
  Link2,
  Lightbulb,
  Rocket,
  Loader,
  Loader2,
  Layout,
  BarChart3,
  FormInput,
  Database,
  ShoppingCart,
  CreditCard,
  UserCircle,
  Image,
  Zap,
  Crown,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";

import { AppFooter } from "@/components/app-footer";
import { Container } from "@/components/container";
import { FigmaImportButton } from "@/components/figma-import-button";
import { FileBadge } from "@/components/file-badge";
import { ImageUploadArea } from "@/components/image-upload-area";
import { TextareaWithLimit } from "@/components/textarea-with-limit";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spotlight } from "@/components/ui/spotlight";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UnifiedCard, UnifiedCardData } from "@/components/unified-card";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tables } from "@/types_db";
import { Framework } from "@/utils/config";
import { defaultTheme, maxImagesUpload, themes } from "@/utils/config";
import { validateFile } from "@/utils/file-helper";
import { IntegrationType, UserIntegration } from "@/utils/integrations";
import { promptEnhancer } from "@/utils/prompt-enhancer";
import { buildDocsUrl, githubRepoUrl } from "@/utils/runtime-config";
import { createClient } from "@/utils/supabase/client";

import { createChat, type GetComponentsReturnType } from "./components/actions";

// Types pour les thèmes
export type ThemeType = "light" | "dark" | "system";

// Types pour les frameworks
export type FrameworkType = "next" | "react" | "vue" | "angular" | "svelte";

const promptCategories = [
  {
    title: "UI Components",
    icon: Layout,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    prompts: [
      {
        text: "Hero section",
        input:
          "A landing page hero section with a heading, leading text and an opt-in form.",
      },
      {
        text: "Navigation bar",
        input:
          "A sticky header with animated dropdown menus, search bar, and responsive behavior that transforms into a drawer on mobile.",
      },
      {
        text: "Pricing table",
        input:
          "A modern pricing comparison table with Starter, Pro and Enterprise plans highlighting key features and annual/monthly toggle.",
      },
      {
        text: "Testimonials",
        input:
          "A carousel of client testimonials with profile pictures, company logos, star ratings and detailed feedback.",
      },
      {
        text: "Features grid",
        input:
          "An interactive features showcase with animated icons, benefit descriptions and hover effects arranged in a responsive grid.",
      },
      {
        text: "FAQ accordion",
        input:
          "An expandable FAQ section with smooth animations, search functionality and categorized questions.",
      },
    ],
  },
  {
    title: "Dashboard & Analytics",
    icon: BarChart3,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    prompts: [
      {
        text: "Ecommerce dashboard",
        input:
          "An ecommerce dashboard with a sidebar navigation and a table of recent orders.",
      },
      {
        text: "Stats dashboard",
        input:
          "An analytics dashboard with interactive charts, data tables and customizable date range selectors.",
      },
      {
        text: "Admin panel",
        input:
          "A full admin panel with user management, settings, analytics overview and navigation sidebar.",
      },
    ],
  },
  {
    title: "Forms & Input",
    icon: FormInput,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    prompts: [
      {
        text: "Contact form",
        input:
          "A contact form with first name, last name, email, and message fields. Put the form in a card with a submit button.",
      },
      {
        text: "Multi-step form",
        input:
          "A multi-step registration form with progress indicator, validation and smooth transitions between steps.",
      },
      {
        text: "Search with filters",
        input:
          "An advanced search interface with filters, sorting options and real-time results display.",
      },
    ],
  },
  {
    title: "E-commerce",
    icon: ShoppingCart,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    prompts: [
      {
        text: "Product catalog",
        input:
          "A product listing page with grid layout, filters, sorting, and quick view functionality.",
      },
      {
        text: "Shopping cart",
        input:
          "A shopping cart interface with item list, quantity controls, price calculation and checkout button.",
      },
      {
        text: "Checkout page",
        input:
          "A complete checkout page with billing form, payment method selection and order summary.",
      },
    ],
  },
  {
    title: "Media & Gallery",
    icon: Image,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    prompts: [
      {
        text: "Image gallery",
        input:
          "A responsive masonry image gallery with lightbox preview, filtering capabilities and lazy loading.",
      },
      {
        text: "Video player",
        input:
          "A custom video player with controls, playlist, quality selector and fullscreen mode.",
      },
      {
        text: "Portfolio grid",
        input:
          "A creative portfolio grid showcasing projects with hover effects, categories and detailed project pages.",
      },
    ],
  },
  {
    title: "User Interface",
    icon: UserCircle,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    prompts: [
      {
        text: "User profile",
        input:
          "A user profile page with avatar upload, editable personal information and activity timeline.",
      },
      {
        text: "Settings page",
        input:
          "A settings interface with tabs for account, preferences, notifications and privacy controls.",
      },
      {
        text: "Notification center",
        input:
          "A notification center with grouped notifications, mark as read functionality and filters.",
      },
    ],
  },
  {
    title: "Integrations",
    icon: Zap,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    prompts: [
      {
        text: "Supabase Auth",
        input:
          "A complete authentication system with Supabase including login, signup, password reset and protected routes.",
        integration: "supabase",
      },
      {
        text: "Supabase CRUD",
        input:
          "A full CRUD application with Supabase for managing a data table with create, read, update and delete operations.",
        integration: "supabase",
      },
      {
        text: "Database dashboard",
        input:
          "An admin dashboard connected to a database showing real-time data, CRUD operations and data visualization.",
        integration: "supabase",
      },
    ],
  },
];

const frameworkConfig = {
  [Framework.REACT]: { icon: SiReact, badge: null, disabled: false },
  [Framework.VUE]: { icon: SiVuedotjs, badge: null, disabled: false },
  [Framework.SVELTE]: { icon: SiSvelte, badge: null, disabled: false },
  [Framework.ANGULAR]: { icon: SiAngular, badge: null, disabled: false },
  [Framework.HTML]: { icon: SiHtml5, badge: null, disabled: false },
};

interface HeroProps {
  popularComponents?: GetComponentsReturnType[];
  initialIsLoggedIn?: boolean;
  initialSubscription?:
    | (Tables<"subscriptions"> & {
        prices: Partial<Tables<"prices">> | null;
      })
    | null;
  initialIntegrations?: UserIntegration[];
}

export default function Hero({
  popularComponents = [],
  initialIsLoggedIn = false,
  initialSubscription = null,
  initialIntegrations = [],
}: HeroProps) {
  const { toast } = useToast();
  const { openLogin } = useAuthModal();
  const [prompt, setPrompt] = useState("");
  useEffect(() => {
    const savedPrompt = localStorage.getItem("lastPrompt");
    if (savedPrompt) {
      setPrompt(savedPrompt);
    }
  }, []);

  const [isVisible, setVisible] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState(defaultTheme);
  const [selectedFramework, setSelectedFramework] = useState<Framework>(
    Framework.REACT,
  );
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<
    "generate" | "improve" | null
  >(null);
  const [images, setImages] = useState<File[]>([]);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [cloneContext, setCloneContext] = useState("");
  const [generationMode, setGenerationMode] = useState<"scratch" | "clone">(
    "scratch",
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hasImproved, setHasImproved] = useState(false);
  const [promptIsValid, setPromptIsValid] = useState(true);
  const [cloneContextIsValid, setCloneContextIsValid] = useState(true);
  const [subscription, setSubscription] = useState<
    | (Tables<"subscriptions"> & {
        prices: Partial<Tables<"prices">> | null;
      })
    | null
  >(initialSubscription);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(initialIsLoggedIn);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showUrlInPromptModal, setShowUrlInPromptModal] = useState(false);
  const [shouldContinueWithUrl, setShouldContinueWithUrl] = useState(false);
  const [userIntegrations, setUserIntegrations] =
    useState<UserIntegration[]>(initialIntegrations);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(
    null,
  );
  const isPremium = !!subscription;
  const [showPromptIdeasDialog, setShowPromptIdeasDialog] = useState(false);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      const length = inputRef.current.value.length;
      inputRef.current.setSelectionRange(length, length);
    }
  }, []);

  useEffect(() => {
    if (prompt) {
      localStorage.setItem("lastPrompt", prompt);
    }
  }, [prompt]);

  useEffect(() => {
    const textarea = inputRef.current;
    return () => {
      if (textarea) {
        textarea.onpaste = null;
      }
    };
  }, [inputRef]);

  useEffect(() => {
    setIsLoggedIn(initialIsLoggedIn);
    setSubscription(initialSubscription);
    setUserIntegrations(initialIntegrations);
  }, [initialIsLoggedIn, initialSubscription, initialIntegrations]);

  const loadUserData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user?.id) {
        setSubscription(null);
        setUserIntegrations([]);
        setSelectedIntegration(null);
        return;
      }

      setIsLoadingSubscription(true);
      const [sub, integrations] = await Promise.all([
        (async () => {
          try {
            const { data } = await supabase
              .from("subscriptions")
              .select("*, prices(*, products(*))")
              .in("status", ["trialing", "active"])
              .eq("user_id", user.id)
              .maybeSingle();
            return data;
          } catch {
            return null;
          }
        })(),
        (async () => {
          try {
            const { data: integrations } = await supabase
              .from("integrations")
              .select("*")
              .eq("user_id", user.id);
            return integrations || [];
          } catch {
            return [];
          }
        })(),
      ]);
      setSubscription(sub);
      setUserIntegrations(integrations as UserIntegration[]);
      if (!sub) {
        setSelectedIntegration(null);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setSubscription(null);
      setUserIntegrations([]);
      setSelectedIntegration(null);
    } finally {
      setIsLoadingSubscription(false);
    }
  }, []);

  useEffect(() => {
    if (
      initialIsLoggedIn &&
      (!initialSubscription || initialIntegrations.length === 0)
    ) {
      loadUserData();
    }
  }, [
    initialIsLoggedIn,
    initialSubscription,
    initialIntegrations.length,
    loadUserData,
  ]);

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;

      const newFiles = Array.from(e.target.files);
      const validFiles: File[] = [];

      for (const file of newFiles) {
        const validation = validateFile(file);

        if (!validation.valid) {
          toast({
            variant: "destructive",
            title: "Invalid file",
            description: validation.error,
            duration: 4000,
          });
          continue;
        }

        if (images.length + validFiles.length >= maxImagesUpload) {
          toast({
            variant: "destructive",
            title: "Too many files",
            description: `Maximum ${maxImagesUpload} files allowed`,
            duration: 4000,
          });
          break;
        }

        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        setImages((prev) => [...prev, ...validFiles]);
      }

      if (e.target) {
        e.target.value = "";
      }
    },
    [toast, images.length],
  );

  const isRestrictedWebsite = (url: string): string | null => {
    const restrictedDomains = [
      { pattern: /\.gov(\.|$|\/)/, reason: "Government websites" },
      { pattern: /\.gouv(\.|$|\/)/, reason: "Government websites" },
      { pattern: /\.mil(\.|$|\/)/, reason: "Military websites" },
      { pattern: /\.police(\.|$|\/)/, reason: "Law enforcement websites" },
      { pattern: /\.bank(\.|$|\/)/, reason: "Banking websites" },
      { pattern: /\.edu(\.|$|\/)/, reason: "Educational institution websites" },
      {
        pattern: /localhost|127\.0\.0\.1/,
        reason: "Local development servers",
      },
    ];

    for (const { pattern, reason } of restrictedDomains) {
      if (pattern.test(url.toLowerCase())) {
        return reason;
      }
    }
    return null;
  };

  const containsUrl = (text: string): boolean => {
    const urlPattern =
      /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/gi;
    return urlPattern.test(text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn) {
      toast({
        title: "Login required",
        description:
          "Sign in to start generating amazing UI components with AI!",
        action: (
          <button
            onClick={() => openLogin()}
            className="bg-primary text-primary-foreground inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium"
          >
            Login
          </button>
        ),
        duration: 5000,
      });
      return;
    }

    const finalPrompt =
      generationMode === "clone" ? cloneContext.trim() : prompt;
    const aiPrompt = finalPrompt;

    if (generationMode === "scratch" && !prompt.trim()) {
      toast({
        variant: "destructive",
        title: "Prompt required",
        description: "Please enter a prompt to generate a component.",
        duration: 4000,
      });
      return;
    }

    if (
      generationMode === "scratch" &&
      containsUrl(prompt) &&
      !shouldContinueWithUrl
    ) {
      if (!showUrlInPromptModal) {
        setShowUrlInPromptModal(true);
        return;
      }
    }

    if (generationMode === "clone") {
      if (!websiteUrl.trim()) {
        toast({
          variant: "destructive",
          title: "URL required",
          description: "Please enter a website URL to clone.",
          duration: 4000,
        });
        return;
      }

      let urlToUse = websiteUrl.trim();
      if (!/^https?:\/\//i.test(urlToUse)) {
        urlToUse = "https://" + urlToUse;
      }

      try {
        new URL(urlToUse);
      } catch {
        toast({
          variant: "destructive",
          title: "Invalid URL",
          description:
            "Please enter a valid website URL (e.g., https://netflix.com).",
          duration: 4000,
        });
        return;
      }

      setWebsiteUrl(urlToUse);

      const restriction = isRestrictedWebsite(urlToUse);
      if (restriction) {
        toast({
          variant: "destructive",
          title: "Restricted Website",
          description: `Cloning ${restriction} is not allowed for ethical reasons.`,
          duration: 4000,
        });
        return;
      }

      // Show the ethical use confirmation modal and return
      if (!showCloneModal) {
        setShowCloneModal(true);
        return;
      }

      // If modal was shown but they didn't agree to terms
      if (!agreeToTerms) {
        toast({
          variant: "destructive",
          title: "Agreement Required",
          description: "You must agree to the ethical use policy to continue.",
          duration: 4000,
        });
        return;
      }
    }

    // Vérification de la validité de la longueur du prompt
    if (generationMode === "scratch" && !promptIsValid) {
      toast({
        variant: "destructive",
        title: "Prompt is too long",
        description: `Your prompt exceeds the character limit. Please shorten it to continue.`,
        duration: 4000,
      });
      return;
    }

    // Vérification de la validité de la longueur du contexte de clone
    if (generationMode === "clone" && !cloneContextIsValid) {
      toast({
        variant: "destructive",
        title: "Clone context is too long",
        description: `Your clone context exceeds the character limit. Please shorten it to continue.`,
        duration: 4000,
      });
      return;
    }

    setLoading(true);
    setLoadingAction("generate");
    const formData = new FormData();
    const libraryPaths: string[] = [];
    images.forEach((image) => {
      const libraryPath = (image as File & { __libraryPath?: string })
        .__libraryPath;
      if (libraryPath) {
        // Fichier de la bibliothèque - envoyer juste le path
        libraryPaths.push(libraryPath);
      } else {
        // Nouveau fichier - uploader
        formData.append("files", image);
      }
    });
    if (libraryPaths.length > 0) {
      formData.append("libraryPaths", JSON.stringify(libraryPaths));
    }
    formData.append("isVisible", isVisible.toString());
    formData.append("theme", selectedTheme);
    formData.append("framework", selectedFramework);

    if (selectedIntegration) {
      formData.append("integrationId", selectedIntegration);
    }

    if (generationMode === "clone" && websiteUrl) {
      let urlToUse = websiteUrl.trim();
      if (!/^https?:\/\//i.test(urlToUse)) {
        urlToUse = "https://" + urlToUse;
      }
      formData.append("cloneUrl", urlToUse);
    }

    formData.append("prompt", finalPrompt);
    formData.append("aiPrompt", aiPrompt);

    const { slug, error } = await createChat(finalPrompt, formData);
    if (error) {
      const isLimitError =
        error.title?.toLowerCase().includes("rocket limit") ||
        error.title?.toLowerCase().includes("limit") ||
        error.title?.toLowerCase().includes("reached");
      const isPaywallError =
        error.title?.toLowerCase().includes("paid plan required") ||
        error.title?.toLowerCase().includes("subscription required");

      if (isLimitError) {
        toast({
          variant: "destructive",
          title: error.title,
          description: error.description,
          duration: 5000,
        });
        setTimeout(() => {
          router.push("/pricing?reason=limit-exceeded");
        }, 500);
        setLoading(false);
        setLoadingAction(null);
        return;
      }

      if (isPaywallError) {
        toast({
          variant: "destructive",
          title: error.title,
          description: error.description,
          duration: 5000,
        });
        setTimeout(() => {
          router.push("/pricing");
        }, 500);
        setLoading(false);
        setLoadingAction(null);
        return;
      }

      toast({
        variant: "destructive",
        title: error.title,
        description: error.description,
        duration: 4000,
      });
      setLoading(false);
      setLoadingAction(null);
      return;
    }
    localStorage.removeItem("lastPrompt");
    setShouldContinueWithUrl(false);
    router.push(`/components/${slug}`);
    return;
  };

  const handleBadgeClick = (input: string, integration?: string) => {
    setPrompt(input);
    setGenerationMode("scratch");
    setShowPromptIdeasDialog(false);

    if (integration === "supabase") {
      const supabaseIntegrations = userIntegrations.filter(
        (i) => i.integration_type === IntegrationType.SUPABASE && i.is_active,
      );
      if (supabaseIntegrations.length > 0) {
        setSelectedIntegration(supabaseIntegrations[0].id);
      }
    }
  };

  const handleButtonClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleImageRemove = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (images.length === 1 && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleVisibility = async () => {
    if (!isLoggedIn) {
      toast({
        title: "Login required",
        description:
          "Sign in to manage your component visibility and share your creations!",
        action: (
          <button
            onClick={() => openLogin()}
            className="bg-primary text-primary-foreground inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium"
          >
            Login
          </button>
        ),
        duration: 5000,
      });
      return;
    }

    if (subscription) {
      setVisible(!isVisible);
    } else {
      toast({
        title: "Premium feature",
        description:
          "Upgrade to Premium to control component visibility and manage privacy settings!",
        action: (
          <a
            href="/pricing"
            className="bg-primary text-primary-foreground inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium"
          >
            Upgrade
          </a>
        ),
        duration: 5000,
      });
    }
  };

  const handleImprovePrompt = async () => {
    if (!prompt) {
      toast({
        variant: "destructive",
        title: "Prompt required",
        description: "Please enter a prompt to improve.",
        duration: 4000,
      });
      return;
    }
    if (!isLoggedIn) {
      toast({
        title: "Login required",
        description:
          "Sign in to use AI-powered prompt improvement and enhance your ideas!",
        action: (
          <button
            onClick={() => openLogin()}
            className="bg-primary text-primary-foreground inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium"
          >
            Login
          </button>
        ),
        duration: 5000,
      });
      return;
    }
    setLoading(true);
    setLoadingAction("improve");

    if (subscription) {
      try {
        const improvedPrompt = await promptEnhancer(prompt, selectedFramework);
        setPrompt(improvedPrompt);
        setHasImproved(true);
      } catch {
        toast({
          variant: "destructive",
          title: "Error",
          description: "An error occurred while improving the prompt.",
          duration: 4000,
        });
      }
    } else {
      toast({
        title: "Premium feature",
        description:
          "Upgrade to Premium to unlock AI-powered prompt improvement and create better components!",
        action: (
          <a
            href="/pricing"
            className="bg-primary text-primary-foreground inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium"
          >
            Upgrade
          </a>
        ),
        duration: 5000,
      });
    }
    setLoading(false);
    setLoadingAction(null);
  };

  const handleCloneModalClose = () => {
    setShowCloneModal(false);
    setAgreeToTerms(false);
  };

  const handleAgreeAndContinue = () => {
    if (agreeToTerms) {
      setShowCloneModal(false);
      // Call handleSubmit again, now with agreement
      handleSubmit(new Event("submit") as unknown as React.FormEvent);
    }
  };

  return (
    <Container className="relative flex w-auto flex-col items-center pr-2 sm:pr-11">
      <AnimatedGridPattern
        numSquares={80}
        maxOpacity={0.1}
        duration={1}
        className={cn(
          "mask-[radial-gradient(500px_circle_at_center,hsl(var(--secondary)),transparent)]",
          "inset-x-0 inset-y-[-20%] h-full skew-y-12 opacity-75",
        )}
      />
      <Spotlight
        className="-top-40 left-0 md:-top-20 md:left-60"
        fill="hsl(var(--primary))"
      />
      <div className="flex min-h-[calc(100vh-20%)] w-full flex-col items-center justify-center space-y-6">
        <div className="flex w-full flex-col items-center justify-center space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="secondary">Open source</Badge>
            <Badge variant="secondary">Self-hostable</Badge>
            <Badge variant="secondary">GitHub + Supabase</Badge>
          </div>
          <h1
            className="text-center text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
            data-testid="home-h1"
          >
            Build Open Source Web Apps
            <span className="text-primary"> with AI</span>
          </h1>
          <p className="text-foreground max-w-3xl text-center text-lg">
            {generationMode === "scratch" ? (
              <>
                Generate production-ready Tailwind v4 websites and UI components
                from text or images. Self-host the stack, connect GitHub, and
                deploy faster.{" "}
                <span className="text-muted-foreground">
                  Formerly Tailwind AI.
                </span>
              </>
            ) : (
              <>
                Clone any website by URL and turn it into Tailwind-ready code
                you can self-host, extend, and ship from your own workflow.{" "}
                <span className="text-muted-foreground">
                  Formerly Tailwind AI.
                </span>
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="sm" variant="outline">
              <Link href="/open-source">Explore Open Source</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <a href={githubRepoUrl} target="_blank" rel="noopener noreferrer">
                View GitHub Repo
              </a>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <a
                href={buildDocsUrl("/")}
                target="_blank"
                rel="noopener noreferrer"
              >
                Self-Hosting Docs
              </a>
            </Button>
          </div>
          <form
            id="generate-form"
            className="group bg-secondary relative z-10 flex w-full flex-col items-center justify-center space-y-3 gap-x-0 rounded-lg border p-3 text-center xl:w-3/4"
            onSubmit={handleSubmit}
          >
            <Tabs
              value={generationMode}
              className="w-full border-none"
              onValueChange={(value) => {
                if (loading) return;
                setGenerationMode(value as "scratch" | "clone");
                setShouldContinueWithUrl(false);
              }}
            >
              <TabsList className="bg-secondary mb-3 w-full border-none">
                <TabsTrigger
                  value="scratch"
                  className="bg-secondary w-1/2 p-2"
                  disabled={loading} // Disable tab when loading
                >
                  Generate from scratch
                </TabsTrigger>
                {selectedFramework === Framework.HTML ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="w-1/2">
                          <TabsTrigger
                            value="clone"
                            className="bg-secondary w-full p-2"
                            disabled
                          >
                            Clone a website
                          </TabsTrigger>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="text-center">
                        Website cloning is unavailable in HTML mode.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <TabsTrigger
                    value="clone"
                    className="bg-secondary w-1/2 p-2"
                    disabled={loading} // Also disable when loading
                  >
                    Clone a website
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent
                value="scratch"
                className="min-h-38 w-full overflow-y-auto"
              >
                <div className="flex size-full flex-col items-end">
                  <div className="flex w-full items-start">
                    <Terminal className="mx-2 my-3 size-4" />
                    <div className="relative w-full">
                      <TextareaWithLimit
                        ref={inputRef}
                        placeholder="Start generating a beautiful Tailwind web app or component"
                        autoFocus={true}
                        required
                        value={prompt}
                        showCounter={true}
                        isLoggedIn={isLoggedIn}
                        isLoading={loading}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            if (event.shiftKey) {
                              return;
                            }

                            event.preventDefault();

                            handleSubmit(event);
                          }
                        }}
                        translate="no"
                        onChange={(value, isValid) => {
                          setPrompt(value);
                          setPromptIsValid(isValid);
                          localStorage.setItem("lastPrompt", value);
                        }}
                        subscription={subscription}
                        isLoadingSubscription={isLoadingSubscription}
                        className="bg-secondary max-h-[400px] min-h-[76px] border-none pl-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>
                  <div
                    className={cn(
                      "text-foreground my-0.5 text-xs transition-opacity",
                      prompt.length <= 3 && "opacity-0",
                    )}
                  >
                    Use{" "}
                    <kbd className="bg-background rounded-md p-1">Shift</kbd> +{" "}
                    <kbd className="bg-background rounded-md p-1">Return</kbd>{" "}
                    for a new line
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="clone"
                className="min-h-38 w-full overflow-y-auto"
              >
                <div className="flex w-full flex-col gap-3">
                  <div className="flex w-full items-start">
                    <Link2 className="mx-2 my-3 size-4" />
                    <div className="relative w-full">
                      <Input
                        type="url"
                        placeholder="Enter website URL to clone (e.g., https://example.com)"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        disabled={loading}
                        className="bg-secondary shadow-none border-none pl-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>
                  <div className="flex w-full items-start">
                    <Terminal className="mx-2 my-3 size-4 text-muted-foreground" />
                    <div className="relative w-full">
                      <TextareaWithLimit
                        placeholder="Add context for the clone (optional) - e.g., focus on the hero section, use a dark theme..."
                        value={cloneContext}
                        onChange={(value, isValid) => {
                          setCloneContext(value);
                          setCloneContextIsValid(isValid);
                        }}
                        disabled={loading}
                        showCounter={true}
                        isLoggedIn={isLoggedIn}
                        isLoading={loading}
                        subscription={subscription}
                        isLoadingSubscription={isLoadingSubscription}
                        className="bg-secondary min-h-[60px] max-h-[120px] resize-none border-none pl-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex w-full flex-1 flex-col gap-3">
              {generationMode === "scratch" && images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((file, index) => (
                    <FileBadge
                      key={`${file.name}-${index}`}
                      file={file}
                      onRemove={() => handleImageRemove(index)}
                      disabled={loading}
                    />
                  ))}
                </div>
              )}

              <div className="flex w-full flex-col items-center justify-between space-y-2 lg:flex-row lg:space-y-0">
                <div className="flex w-full items-center space-x-2">
                  <Tabs
                    defaultValue="public"
                    value={isVisible ? "public" : "private"}
                    onValueChange={(value) => {
                      if (value === "public" && !isVisible) handleVisibility();
                      if (value === "private" && isVisible) handleVisibility();
                    }}
                    className="w-full lg:w-auto"
                  >
                    <TabsList
                      isReverse={true}
                      className="grid w-full min-w-32 grid-cols-2"
                    >
                      <TabsTrigger
                        isReverse={true}
                        value="public"
                        disabled={loading}
                      >
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Globe className="block size-4" />
                            </TooltipTrigger>
                            <TooltipContent>Public</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TabsTrigger>
                      <TabsTrigger
                        isReverse={true}
                        value="private"
                        disabled={loading}
                      >
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Lock className="block size-4" />
                            </TooltipTrigger>
                            <TooltipContent>Private</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Select
                    disabled={loading}
                    defaultValue="react"
                    value={selectedFramework}
                    onValueChange={(value) => {
                      setSelectedFramework(value as Framework);
                      if (value === Framework.HTML) {
                        setGenerationMode("scratch");
                        setSelectedIntegration(null);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 w-full rounded-md sm:w-auto">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const config = frameworkConfig[selectedFramework];
                          const Icon = config.icon;
                          return (
                            <>
                              <Icon className="size-3 shrink-0" />
                              <span className="hidden sm:inline">
                                {selectedFramework.charAt(0).toUpperCase() +
                                  selectedFramework.slice(1)}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Framework)
                        .filter(
                          (framework) =>
                            !(
                              generationMode === "clone" &&
                              framework === Framework.HTML
                            ),
                        )
                        .map((framework) => {
                          const config = frameworkConfig[framework];
                          const Icon = config.icon;

                          return (
                            <SelectItem
                              key={framework}
                              value={framework}
                              className={cn(
                                "cursor-pointer",
                                config.disabled &&
                                  "cursor-not-allowed opacity-50",
                              )}
                              disabled={config.disabled}
                              onSelect={
                                config.disabled
                                  ? (e) => e.preventDefault()
                                  : undefined
                              }
                            >
                              <div
                                className={cn(
                                  "mr-2 flex w-full flex-row items-center justify-between",
                                  config.disabled && "pointer-events-none",
                                )}
                              >
                                <div className="flex items-center">
                                  <Icon className="mr-2 size-3" />
                                  <span className="text-sm">
                                    {framework.charAt(0).toUpperCase() +
                                      framework.slice(1)}
                                  </span>
                                </div>
                                {config.badge && (
                                  <Badge
                                    variant={
                                      config.badge === "Soon"
                                        ? "outline"
                                        : "secondary"
                                    }
                                    className={cn(
                                      "text-xs",
                                      config.badge === "Soon" ? "ml-2" : "mr-1",
                                    )}
                                  >
                                    {config.badge}
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                  {generationMode === "scratch" && isLoadingSubscription && (
                    <>
                      <Skeleton className="h-8 w-20 rounded-md bg-background" />
                      <Skeleton className="h-8 w-20 rounded-md bg-background" />
                    </>
                  )}
                  {generationMode === "scratch" && !isLoadingSubscription && (
                    <>
                      <ImageUploadArea
                        fileInputRef={fileInputRef}
                        disabled={loading || images.length >= maxImagesUpload}
                        handleButtonClick={handleButtonClick}
                        handleImageChange={handleImageChange}
                        onDrop={(droppedFiles) => {
                          const validFiles: File[] = [];

                          for (const file of droppedFiles) {
                            if (
                              images.length + validFiles.length >=
                              maxImagesUpload
                            ) {
                              toast({
                                variant: "destructive",
                                title: "Too many files",
                                description: `Maximum ${maxImagesUpload} files allowed`,
                                duration: 4000,
                              });
                              break;
                            }

                            const validation = validateFile(file);
                            if (!validation.valid) {
                              toast({
                                variant: "destructive",
                                title: "Invalid file",
                                description: validation.error,
                                duration: 4000,
                              });
                              continue;
                            }

                            validFiles.push(file);
                          }

                          if (validFiles.length > 0) {
                            setImages((prev) => [...prev, ...validFiles]);
                          }
                        }}
                        isReverse={true}
                        isUploading={loading && images.length > 0}
                        subscription={subscription}
                        isLoggedIn={isLoggedIn}
                        currentFilesCount={images.length}
                        onFileSelectFromLibrary={async (libraryFile) => {
                          try {
                            const response = await fetch(libraryFile.publicUrl);
                            const blob = await response.blob();
                            const fileName = libraryFile.name;
                            const file = new File([blob], fileName, {
                              type: libraryFile.mimeType,
                            });
                            (
                              file as File & { __libraryPath?: string }
                            ).__libraryPath = libraryFile.path;

                            if (images.length >= maxImagesUpload) {
                              toast({
                                variant: "destructive",
                                title: "Too many files",
                                description: `Maximum ${maxImagesUpload} files allowed`,
                                duration: 4000,
                              });
                              return;
                            }

                            const validation = validateFile(file);
                            if (!validation.valid) {
                              toast({
                                variant: "destructive",
                                title: "Invalid file",
                                description: validation.error,
                                duration: 4000,
                              });
                              return;
                            }

                            setImages((prev) => [...prev, file]);
                          } catch (error) {
                            console.error(
                              "Error loading file from library:",
                              error,
                            );
                            toast({
                              variant: "destructive",
                              title: "Error",
                              description:
                                "Failed to load file from library. Please try again.",
                              duration: 4000,
                            });
                          }
                        }}
                        onFileDeleted={(deletedPath) => {
                          setImages((prev) =>
                            prev.filter(
                              (file) =>
                                (file as File & { __libraryPath?: string })
                                  .__libraryPath !== deletedPath,
                            ),
                          );
                        }}
                        onFileUpload={(uploadedFiles) => {
                          const validFiles: File[] = [];

                          for (const file of uploadedFiles) {
                            if (
                              images.length + validFiles.length >=
                              maxImagesUpload
                            ) {
                              toast({
                                variant: "destructive",
                                title: "Too many files",
                                description: `Maximum ${maxImagesUpload} files allowed`,
                                duration: 4000,
                              });
                              break;
                            }

                            const validation = validateFile(file);
                            if (!validation.valid) {
                              toast({
                                variant: "destructive",
                                title: "Invalid file",
                                description: validation.error,
                                duration: 4000,
                              });
                              continue;
                            }

                            validFiles.push(file);
                          }

                          if (validFiles.length > 0) {
                            setImages((prev) => [...prev, ...validFiles]);
                          }
                        }}
                      />
                      <FigmaImportButton
                        disabled={loading}
                        framework={selectedFramework}
                        subscription={subscription}
                        isLoggedIn={isLoggedIn}
                        isReverse={true}
                        isUploading={loading && images.length > 0}
                        onFileImport={(file) => {
                          setImages((prev) => [...prev, file]);
                        }}
                      />
                    </>
                  )}
                  {selectedFramework === Framework.HTML && (
                    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                      <SheetTrigger asChild>
                        <Button
                          disabled={loading}
                          variant="background"
                          size="sm"
                          className="w-full sm:w-auto"
                        >
                          <Paintbrush className="size-4 shrink-0" />
                          <span className="hidden first-letter:uppercase sm:inline">
                            {selectedTheme}
                          </span>
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="overflow-auto">
                        <SheetTitle className="mb-4">
                          Component Theme
                        </SheetTitle>
                        <div>
                          <h3 className="mb-1 text-base font-semibold">
                            Set theme for the component
                          </h3>
                          <h4 className="mb-4 text-sm">
                            Selected theme:{" "}
                            <span className="text-primary">
                              {selectedTheme}
                            </span>
                          </h4>
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                              {themes.map((theme) => (
                                <div
                                  key={theme}
                                  className={cn(
                                    "border-primary/20 hover:border-primary relative aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 p-1 opacity-75 transition-all duration-300 hover:opacity-100",
                                    {
                                      "border-primary opacity-100":
                                        selectedTheme === theme,
                                    },
                                    loading && "pointer-events-none opacity-50",
                                  )}
                                  onClick={() => {
                                    if (loading) return;
                                    setSelectedTheme(theme);
                                    setSheetOpen(false);
                                  }}
                                >
                                  <img
                                    src={`/daisy-themes/${theme}.png`}
                                    alt="Theme"
                                    className="size-full scale-110 object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>
                  )}
                  {selectedFramework !== Framework.HTML &&
                    isLoadingSubscription && (
                      <Skeleton className="h-8 w-20 rounded-md bg-background" />
                    )}
                  {selectedFramework !== Framework.HTML &&
                    !isLoadingSubscription && (
                      <>
                        {!isLoggedIn ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="background"
                            className="h-8 w-full gap-2 text-xs sm:w-auto"
                            disabled={loading}
                            onClick={() => {
                              toast({
                                title: "Login required",
                                description:
                                  "Sign in to connect your database and unlock powerful features!",
                                action: (
                                  <button
                                    onClick={() => openLogin()}
                                    className="bg-primary text-primary-foreground inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium"
                                  >
                                    Login
                                  </button>
                                ),
                                duration: 5000,
                              });
                            }}
                            title="Login to use database integrations"
                          >
                            <Database className="size-3.5 shrink-0" />
                            <span className="hidden sm:inline">Database</span>
                            <Crown className="hidden size-3 shrink-0 text-amber-500 sm:inline" />
                          </Button>
                        ) : !isPremium ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="background"
                            className="h-8 w-full gap-2 text-xs sm:w-auto"
                            disabled={loading}
                            onClick={() => {
                              toast({
                                title: "Premium feature",
                                description:
                                  "Upgrade to Premium to connect Supabase and build full-stack applications with AI!",
                                action: (
                                  <a
                                    href="/pricing"
                                    className="bg-primary text-primary-foreground inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium"
                                  >
                                    Upgrade
                                  </a>
                                ),
                                duration: 5000,
                              });
                            }}
                            title="Upgrade to Premium to unlock database integrations"
                          >
                            <Database className="size-3.5 shrink-0" />
                            <span className="hidden sm:inline">Database</span>
                            <Crown className="hidden size-3 shrink-0 text-amber-500 sm:inline" />
                          </Button>
                        ) : userIntegrations.filter(
                            (i) =>
                              i.integration_type === IntegrationType.SUPABASE &&
                              i.is_active,
                          ).length > 0 ? (
                          <Select
                            disabled={loading}
                            value={selectedIntegration || "none"}
                            onValueChange={(value) =>
                              setSelectedIntegration(
                                value === "none" ? null : value,
                              )
                            }
                          >
                            <SelectTrigger className="h-8 w-full rounded-md sm:w-auto">
                              <div className="flex items-center gap-2">
                                <SiSupabase className="size-3.5 shrink-0 text-green-600" />
                                <span className="hidden sm:inline">
                                  {selectedIntegration
                                    ? userIntegrations.find(
                                        (i) => i.id === selectedIntegration,
                                      )?.name || "Database"
                                    : "No App Data"}
                                </span>
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                value="none"
                                className="cursor-pointer"
                              >
                                <div className="mr-2 flex w-full flex-row items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <SiSupabase className="size-4 opacity-30" />
                                    <span>No App Data</span>
                                  </div>
                                </div>
                              </SelectItem>
                              {userIntegrations
                                .filter(
                                  (i) =>
                                    i.integration_type ===
                                      IntegrationType.SUPABASE && i.is_active,
                                )
                                .map((integration) => (
                                  <SelectItem
                                    key={integration.id}
                                    value={integration.id}
                                    className="cursor-pointer"
                                  >
                                    <div className="mr-2 flex w-full flex-row items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <SiSupabase className="size-4 text-green-600" />
                                        <span>{integration.name}</span>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Link href="/account/integrations">
                            <Button
                              type="button"
                              size="sm"
                              variant="background"
                              className="h-8 w-full gap-2 sm:w-auto"
                              disabled={loading}
                            >
                              <SiSupabase className="size-3.5 shrink-0 text-green-600" />
                              <span className="hidden sm:inline">Supabase</span>
                            </Button>
                          </Link>
                        )}
                      </>
                    )}
                </div>
                <div className="flex items-center justify-end space-x-0 lg:space-x-2">
                  {generationMode === "scratch" && (
                    <>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="hover:bg-background"
                              disabled={loading}
                              onClick={() => {
                                setShowPromptIdeasDialog(true);
                              }}
                            >
                              <Lightbulb className="size-4" />
                              <span className="sr-only">Prompt ideas</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Browse prompt ideas</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="hover:bg-background"
                              disabled={loading || hasImproved}
                              onClick={handleImprovePrompt}
                            >
                              {loadingAction === "improve" ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <WandSparkles
                                  className={cn(
                                    "size-4",
                                    hasImproved && "text-primary",
                                  )}
                                />
                              )}
                              <span className="sr-only">
                                {loadingAction === "improve"
                                  ? "Improving prompt..."
                                  : hasImproved
                                    ? "Prompt improved"
                                    : "Improve prompt"}
                              </span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {loadingAction === "improve"
                              ? "Improving prompt..."
                              : hasImproved
                                ? "Prompt improved"
                                : "Improve prompt"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </>
                  )}
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="submit"
                        size="sm"
                        variant="default"
                        className="flex w-full items-center justify-center lg:w-auto"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader className="size-4 animate-spin" />
                            {loadingAction === "generate" && (
                              <span>Generating</span>
                            )}
                            {loadingAction === "improve" && (
                              <span>Improving</span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="flex items-center justify-center">
                              <Rocket className="mr-1 size-4" />
                              {generationMode === "scratch"
                                ? "Generate"
                                : "Clone website"}
                            </span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <Dialog
        open={showCloneModal}
        onOpenChange={(open) => {
          if (!loading && !open) handleCloneModalClose();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ethical Use Agreement</DialogTitle>
            <DialogDescription>
              Before proceeding with website cloning, please confirm your
              commitment to ethical use.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-start space-x-2 pt-4">
            <Checkbox
              id="terms"
              checked={agreeToTerms}
              disabled={loading}
              onCheckedChange={(checked) => {
                setAgreeToTerms(checked as boolean);
              }}
            />
            <Label htmlFor="terms" className="text-sm leading-relaxed">
              I confirm that I will use this feature only for legitimate
              purposes such as learning, prototyping, or non-deceptive use. I
              will not use this tool for phishing, fraud, impersonation, or any
              other illegal or harmful activities. I understand that I am
              responsible for respecting intellectual property rights and terms
              of service of any website I choose to clone.
            </Label>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={handleCloneModalClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAgreeAndContinue}
              disabled={!agreeToTerms || loading}
            >
              Agree & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showUrlInPromptModal}
        onOpenChange={(open) => {
          if (!loading && !open) {
            setShowUrlInPromptModal(false);
            setShouldContinueWithUrl(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>URL Detected in Prompt</DialogTitle>
            <DialogDescription>
              We detected a URL in your prompt. If you want to clone a website,
              please use the &quot;Clone a website&quot; tab instead. Otherwise,
              you can continue with the current generation.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowUrlInPromptModal(false);
                setShouldContinueWithUrl(false);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                setShowUrlInPromptModal(false);
                setShouldContinueWithUrl(false);
                setGenerationMode("clone");
                const urlMatch = prompt.match(
                  /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/i,
                );
                if (urlMatch) {
                  let url = urlMatch[0];
                  if (!/^https?:\/\//i.test(url)) {
                    url = "https://" + url;
                  }
                  setWebsiteUrl(url);
                }
              }}
              disabled={loading}
            >
              Use Clone Mode
            </Button>
            <Button
              onClick={() => {
                setShowUrlInPromptModal(false);
                setShouldContinueWithUrl(true);
                handleSubmit(new Event("submit") as unknown as React.FormEvent);
              }}
              disabled={loading}
            >
              Continue as is
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showPromptIdeasDialog}
        onOpenChange={setShowPromptIdeasDialog}
      >
        <DialogContent className="mx-4 max-h-[80vh] max-w-6xl sm:max-w-4xl overflow-y-auto sm:mx-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Tailwind Component Prompt Ideas
            </DialogTitle>
            <DialogDescription>
              Get inspired with these ready-to-use AI prompts for generating
              Tailwind components, dashboards, forms, and complete web
              applications
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {promptCategories.map((category, categoryIndex) => {
              const IconComponent = category.icon;
              const hasActiveSupabaseIntegration = userIntegrations.some(
                (i) =>
                  i.integration_type === IntegrationType.SUPABASE &&
                  i.is_active,
              );
              const isIntegrationsCategory = category.title === "Integrations";

              return (
                <div
                  key={categoryIndex}
                  className="group border-border bg-background rounded-lg border p-6 shadow-xs transition-all hover:shadow-md"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-10 items-center justify-center rounded-lg",
                        category.bgColor,
                      )}
                    >
                      <IconComponent className={cn("size-5", category.color)} />
                    </div>
                    <h3 className="text-lg font-semibold">{category.title}</h3>
                  </div>

                  <div className="space-y-2">
                    {category.prompts.map((prompt, promptIndex) => {
                      const isSupabasePrompt =
                        "integration" in prompt &&
                        prompt.integration === "supabase";
                      const isDisabled =
                        loading ||
                        (isIntegrationsCategory &&
                          isSupabasePrompt &&
                          !hasActiveSupabaseIntegration);

                      const button = (
                        <button
                          key={promptIndex}
                          type="button"
                          onClick={() => {
                            if (loading || isDisabled) return;
                            const integration =
                              "integration" in prompt
                                ? prompt.integration
                                : undefined;
                            handleBadgeClick(prompt.input, integration);
                          }}
                          disabled={isDisabled}
                          className={cn(
                            "group/item border-border bg-card hover:border-primary hover:bg-accent relative w-full rounded-md border px-3 py-2 text-left text-sm transition-all",
                            isDisabled && "pointer-events-none opacity-50",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{prompt.text}</span>
                            {"integration" in prompt &&
                              prompt.integration === "supabase" && (
                                <SiSupabase className="text-muted-foreground size-3" />
                              )}
                            {"integration" in prompt &&
                              prompt.integration === "database" && (
                                <Database className="text-muted-foreground size-3" />
                              )}
                            {"integration" in prompt &&
                              prompt.integration === "stripe" && (
                                <CreditCard className="text-muted-foreground size-3" />
                              )}
                          </div>
                        </button>
                      );

                      if (
                        isIntegrationsCategory &&
                        isSupabasePrompt &&
                        !hasActiveSupabaseIntegration
                      ) {
                        return (
                          <TooltipProvider key={promptIndex}>
                            <Tooltip>
                              <TooltipTrigger asChild>{button}</TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Connect a Supabase integration to use this
                                  prompt idea
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      }

                      return button;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {popularComponents.length > 0 && (
        <div className="relative mt-3 w-full px-4 pb-10">
          <div className="relative">
            <div className="mb-6 flex flex-col items-start justify-start gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="mb-0.5 text-base font-semibold">
                  Most Popular Components
                </h2>

                <motion.p className="text-muted-foreground text-sm">
                  Discover the most loved components created by our community.
                </motion.p>
              </div>

              <Link href="/components">
                <Button size="lg" variant="outline">
                  <Rocket className="mr-2 size-4" />
                  <span>Explore All Components</span>
                </Button>
              </Link>
            </div>

            <div className="relative">
              <div>
                <div className="grid auto-rows-fr grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {popularComponents.map((component) => {
                    const cardData: UnifiedCardData = {
                      id: component.chat_id,
                      title: component.title || "Untitled",
                      imageUrl: component.screenshot || undefined,
                      framework: component.framework,
                      createdAt: component.created_at,
                      author: component.user_full_name
                        ? {
                            id: component.user_id,
                            name: component.user_full_name,
                          }
                        : undefined,
                      href: `/components/${component.slug}`,
                      likes: component.likes || 0,
                      isLiked: component.user_has_liked ?? false,
                      remixesCount: component.remixes_count || 0,
                      user_avatar_url: component.user_avatar_url,
                      cloneUrl: component.clone_url,
                    };

                    return (
                      <UnifiedCard
                        key={component.chat_id}
                        data={cardData}
                        isLoggedIn={isLoggedIn}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <AppFooter />
    </Container>
  );
}
