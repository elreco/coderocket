"use client";
import {
  SiHtml5,
  SiReact,
  SiVuedotjs,
  SiSvelte,
  SiAngular,
  SiSupabase,
} from "@icons-pack/react-simple-icons";
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
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";

import { getSubscription } from "@/app/supabase-server";
import { Container } from "@/components/container";
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
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Spotlight } from "@/components/ui/spotlight";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tables } from "@/types_db";
import { Framework } from "@/utils/config";
import { defaultTheme, maxImagesUpload, themes } from "@/utils/config";
import { validateFile } from "@/utils/file-helper";
import { IntegrationType, UserIntegration } from "@/utils/integrations";
import { promptEnhancer } from "@/utils/prompt-enhancer";
import { createClient } from "@/utils/supabase/client";

import { fetchUserIntegrations } from "./account/integrations/actions";
import { createChat } from "./components/actions";

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
          "A modern pricing comparison table with Free, Premium and Enterprise plans highlighting key features and annual/monthly toggle.",
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

export default function Hero() {
  const supabase = createClient();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("lastPrompt") || "";
    }
    return "";
  });
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
  const [generationMode, setGenerationMode] = useState<"scratch" | "clone">(
    "scratch",
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hasImproved, setHasImproved] = useState(false);
  const [promptIsValid, setPromptIsValid] = useState(true);
  const [subscription, setSubscription] = useState<
    | (Tables<"subscriptions"> & {
        prices: Partial<Tables<"prices">> | null;
      })
    | null
  >(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [userIntegrations, setUserIntegrations] = useState<UserIntegration[]>(
    [],
  );
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(
    null,
  );
  const isPremium = !!subscription;
  const showIntegrationsButton =
    isLoggedIn && selectedFramework !== Framework.HTML;
  const promptIdeasRef = useRef<HTMLDivElement>(null);

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
    const handlePaste = (event: ClipboardEvent) => {
      const clipboardItems = event.clipboardData?.items;
      if (!clipboardItems) return;

      for (let i = 0; i < clipboardItems.length; i++) {
        const item = clipboardItems[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;

          const validation = validateFile(file);
          if (!validation.valid) {
            toast({
              variant: "destructive",
              title: "Invalid file",
              description: validation.error,
              duration: 4000,
            });
            break;
          }

          if (images.length >= maxImagesUpload) {
            toast({
              variant: "destructive",
              title: "Too many files",
              description: `Maximum ${maxImagesUpload} files allowed`,
              duration: 4000,
            });
            break;
          }

          setImages((prev) => [...prev, file]);
          break;
        }
      }
    };

    const textarea = inputRef.current;
    if (textarea) {
      textarea.addEventListener("paste", handlePaste);
    }

    return () => {
      if (textarea) {
        textarea.removeEventListener("paste", handlePaste);
      }
    };
  }, [inputRef, toast]);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setIsLoadingSubscription(true);
        const { data } = await supabase.auth.getUser();
        setIsLoggedIn(!!data?.user?.id);
        const sub = await getSubscription();
        setSubscription(sub);

        if (data?.user?.id) {
          setIsLoadingIntegrations(true);
          const integrations = await fetchUserIntegrations();
          setUserIntegrations(integrations);
          setIsLoadingIntegrations(false);
        } else {
          setUserIntegrations([]);
          setSelectedIntegration(null);
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setIsLoadingSubscription(false);
      }
    };

    fetchSubscription();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
          setIsLoggedIn(false);
          setUserIntegrations([]);
          setSelectedIntegration(null);
          setSubscription(null);
        } else if (event === "SIGNED_IN" && session?.user) {
          setIsLoggedIn(true);
          const sub = await getSubscription();
          setSubscription(sub);
          setIsLoadingIntegrations(true);
          const integrations = await fetchUserIntegrations();
          setUserIntegrations(integrations);
          setIsLoadingIntegrations(false);
        }
      },
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data } = await supabase.auth.getSession();
    if (!data?.session?.user?.id) {
      toast({
        variant: "destructive",
        title: "Premium account required",
        description:
          "You are not logged in. Please login and upgrade to premium and try again.",
        duration: 4000,
      });
      return;
    }

    // Create a proper prompt for clone mode by including the URL
    let finalPrompt = prompt;
    if (generationMode === "clone" && websiteUrl) {
      // Format the prompt to match the expected pattern for extracting clone URL
      finalPrompt = `Clone this website: ${websiteUrl}`;
    }

    const aiPrompt = finalPrompt; // Prompt complet pour l'IA avec les détails techniques

    // Add validation for empty prompt or url in clone mode
    if (generationMode === "scratch" && !prompt.trim()) {
      toast({
        variant: "destructive",
        title: "Prompt required",
        description: "Please enter a prompt to generate a component.",
        duration: 4000,
      });
      return;
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

      // Add protocol if missing
      let urlToUse = websiteUrl.trim();
      if (!/^https?:\/\//i.test(urlToUse)) {
        urlToUse = "https://" + urlToUse;
        setWebsiteUrl(urlToUse); // Update the state with properly formatted URL
      }

      // Check if website is restricted
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

      // Make sure finalPrompt has the correct URL format
      finalPrompt = `Clone this website: ${urlToUse}`;
    }

    // Vérification de la validité de la longueur du prompt
    if (!promptIsValid) {
      toast({
        variant: "destructive",
        title: "Prompt is too long",
        description: `Your prompt exceeds the character limit. Please shorten it to continue.`,
        duration: 4000,
      });
      return;
    }

    setLoading(true);
    setLoadingAction("generate");
    const formData = new FormData();
    if (generationMode === "scratch") {
      images.forEach((image) => {
        formData.append("files", image);
      });
    }
    formData.append("isVisible", isVisible.toString());
    formData.append("theme", selectedTheme);
    formData.append("framework", selectedFramework);

    if (selectedIntegration) {
      formData.append("integrationId", selectedIntegration);
    }

    // Stocker le prompt simple pour l'affichage et le prompt détaillé pour l'IA
    formData.append("prompt", finalPrompt);
    formData.append("aiPrompt", aiPrompt);

    const { slug, error } = await createChat(finalPrompt, formData);
    if (error) {
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
    router.push(`/components/${slug}`);
    return;
  };

  const handleBadgeClick = (input: string) => {
    setPrompt(input);
    setGenerationMode("scratch");
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
    const { data } = await supabase.auth.getSession();
    if (!data?.session?.user?.id) {
      toast({
        variant: "destructive",
        title: "Premium account required",
        description:
          "You are not logged in, the visibility cannot be changed. Please login and upgrade to premium and try again.",
        duration: 4000,
      });
      return;
    }
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*, prices(*, products(*))")
      .in("status", ["trialing", "active"])
      .eq("user_id", data.session.user.id)
      .maybeSingle();

    if (subscription) {
      setVisible(!isVisible);
    } else {
      toast({
        variant: "destructive",
        title: "Premium account required",
        description:
          "You are not premium, the visibility cannot be changed. Please upgrade to premium and try again.",
        duration: 4000,
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
    const { data } = await supabase.auth.getSession();
    if (!data?.session?.user?.id) {
      toast({
        variant: "destructive",
        title: "Premium account required",
        description:
          "You are not logged in, the prompt cannot be improved. Please login and upgrade to premium and try again.",
        duration: 4000,
      });
      return;
    }
    setLoading(true);
    setLoadingAction("improve");
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*, prices(*, products(*))")
      .in("status", ["trialing", "active"])
      .eq("user_id", data.session.user.id)
      .maybeSingle();

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
        variant: "destructive",
        title: "Premium account required",
        description:
          "You are not premium, the prompt cannot be improved. Please upgrade to premium and try again.",
        duration: 4000,
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
          "[mask-image:radial-gradient(500px_circle_at_center,hsl(var(--secondary)),transparent)]",
          "inset-x-0 inset-y-[-20%] h-full skew-y-12 opacity-75",
        )}
      />
      <Spotlight
        className="-top-40 left-0 md:-top-20 md:left-60"
        fill="hsl(var(--primary))"
      />
      <div className="flex w-full flex-col items-center">
        <div className="flex min-h-screen w-full flex-col items-center justify-center space-y-6">
          <Badge variant="secondary" className="mb-2 text-xs">
            formerly Tailwind AI
          </Badge>
          <h1
            className="text-center text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
            data-testid="home-h1"
          >
            Build Stunning Web Apps
            <span className="text-primary"> with AI</span>
          </h1>
          <p className="text-center text-lg text-muted-foreground">
            {generationMode === "scratch" ? (
              <>
                Generate production-ready Tailwind v4 components from text or
                images. Deploy in seconds.
              </>
            ) : (
              <>
                Clone any website by URL and get Tailwind-ready code instantly.
              </>
            )}
          </p>
          <form
            id="generate-form"
            className="group relative z-10 flex w-full flex-col items-center justify-center gap-x-0 space-y-3 rounded-lg border border-primary/40 bg-secondary p-3 text-center transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 xl:w-3/4"
            onSubmit={handleSubmit}
          >
            <Tabs
              defaultValue="scratch"
              className="w-full"
              onValueChange={(value) => {
                if (loading) return; // Prevent tab change when loading
                setGenerationMode(value as "scratch" | "clone");
              }}
            >
              <TabsList className="mb-3 w-full bg-secondary">
                <TabsTrigger
                  value="scratch"
                  className="w-1/2 bg-secondary p-2"
                  disabled={loading} // Disable tab when loading
                >
                  Generate from scratch
                </TabsTrigger>
                <TabsTrigger
                  value="clone"
                  className="w-1/2 bg-secondary p-2"
                  disabled={selectedFramework === Framework.HTML || loading} // Also disable when loading
                >
                  Generate using a URL
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scratch" className="h-32 w-full">
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
                        className="max-h-[400px] min-h-[76px] border-none bg-secondary pl-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>
                  <div
                    className={cn(
                      "my-0.5 text-xs text-foreground transition-opacity",
                      prompt.length <= 3 && "opacity-0",
                    )}
                  >
                    Use{" "}
                    <kbd className="rounded-sm bg-background p-1">Shift</kbd> +{" "}
                    <kbd className="rounded-sm bg-background p-1">Return</kbd>{" "}
                    for a new line
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="clone"
                className="max-h-[350px] min-h-32 w-full overflow-y-auto"
              >
                <div className="flex w-full flex-col items-end">
                  <div className="flex w-full items-start">
                    <Link2 className="mx-2 my-3 size-4" />
                    <div className="relative w-full">
                      <div className="flex gap-2">
                        <Input
                          type="url"
                          placeholder="Enter website URL to clone (e.g., https://example.com)"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          disabled={loading}
                          className="border-none bg-secondary pl-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>
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
                      className="grid w-full grid-cols-2"
                    >
                      <TabsTrigger
                        isReverse={true}
                        value="public"
                        disabled={loading}
                      >
                        <Globe className="block size-4 xl:hidden" />
                        <span className="hidden xl:block">Public</span>
                      </TabsTrigger>
                      <TabsTrigger
                        isReverse={true}
                        value="private"
                        disabled={loading}
                      >
                        <Lock className="block size-4 xl:hidden" />
                        <span className="hidden xl:block">Private</span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {generationMode === "scratch" && (
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
                      label="Files"
                    />
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
                          <Paintbrush className="size-4" />
                          <span className="first-letter:uppercase">
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
                                    "relative aspect-video cursor-pointer rounded-md items-center justify-center border-2 border-primary/20 opacity-75 transition-all duration-300 hover:border-primary hover:opacity-100 overflow-hidden p-1",
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
                  {showIntegrationsButton && !isLoadingSubscription && (
                    <>
                      {!isPremium ? (
                        <Link href="/pricing">
                          <Button
                            type="button"
                            size="sm"
                            variant="background"
                            className="h-8 w-full gap-2 text-xs sm:w-auto"
                            disabled={loading}
                          >
                            <Lock className="size-3.5" />
                            <span className="hidden sm:inline">
                              Unlock Integrations
                            </span>
                            <span className="sm:hidden">Premium</span>
                          </Button>
                        </Link>
                      ) : isLoadingIntegrations ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="background"
                          className="h-8 w-full gap-2 text-xs sm:w-auto"
                          disabled
                        >
                          <Loader className="size-3.5 animate-spin" />
                          <span className="hidden sm:inline">Loading...</span>
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
                          <SelectTrigger className="h-8 w-full rounded-md border-background sm:w-auto">
                            <SelectValue placeholder="No Database" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="cursor-pointer">
                              <div className="mr-2 flex w-full flex-row items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <SiSupabase className="size-4 opacity-30" />
                                  <span>No Database</span>
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
                            variant="outline"
                            className="h-8 w-full gap-2 text-xs sm:w-auto"
                            disabled={loading}
                          >
                            <SiSupabase className="size-3.5 text-green-600" />
                            Connect Supabase
                          </Button>
                        </Link>
                      )}
                    </>
                  )}
                  <Select
                    disabled={loading}
                    defaultValue="react"
                    onValueChange={(value) => {
                      setSelectedFramework(value as Framework);
                      if (value === Framework.HTML) {
                        setGenerationMode("scratch");
                        setSelectedIntegration(null);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 w-full rounded-md border-background sm:w-auto">
                      <SelectValue
                        className="mr-2"
                        placeholder="Select a framework"
                      />
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
                </div>
                <div className="flex w-full items-center justify-end space-x-0 lg:space-x-2">
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
                                promptIdeasRef.current?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                });
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
      <div
        ref={promptIdeasRef}
        className="mt-16 w-full scroll-mt-24 px-4 pb-16"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight">
              Tailwind Component Prompt Ideas
            </h2>
            <p className="text-lg text-muted-foreground">
              Get inspired with these ready-to-use AI prompts for generating
              Tailwind components, dashboards, forms, and complete web
              applications
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {promptCategories.map((category, categoryIndex) => {
              const IconComponent = category.icon;
              return (
                <div
                  key={categoryIndex}
                  className="group rounded-lg border border-border bg-background p-6 shadow-sm transition-all hover:shadow-md"
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
                    {category.prompts.map((prompt, promptIndex) => (
                      <button
                        key={promptIndex}
                        type="button"
                        onClick={() => {
                          if (loading) return;
                          handleBadgeClick(prompt.input);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        disabled={loading}
                        className={cn(
                          "group/item relative w-full rounded-md border border-border bg-card px-3 py-2 text-left text-sm transition-all hover:border-primary hover:bg-accent",
                          loading && "pointer-events-none opacity-50",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{prompt.text}</span>
                          {"integration" in prompt &&
                            prompt.integration === "supabase" && (
                              <SiSupabase className="size-3 text-muted-foreground" />
                            )}
                          {"integration" in prompt &&
                            prompt.integration === "database" && (
                              <Database className="size-3 text-muted-foreground" />
                            )}
                          {"integration" in prompt &&
                            prompt.integration === "stripe" && (
                              <CreditCard className="size-3 text-muted-foreground" />
                            )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Container>
  );
}
