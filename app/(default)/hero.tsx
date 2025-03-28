"use client";
import { SiHtml5, SiReact, SiVuedotjs } from "@icons-pack/react-simple-icons";
import {
  X as XIcon,
  Terminal,
  Paintbrush,
  Globe,
  Lock,
  WandSparkles,
  Rocket,
  Link2,
  Lightbulb,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";

import { getSubscription } from "@/app/supabase-server";
import { Container } from "@/components/container";
import { ImageSelector } from "@/components/image-selector";
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
import { defaultTheme, maxImageSize, themes } from "@/utils/config";
import { promptEnhancer } from "@/utils/prompt-enhancer";
import { createClient } from "@/utils/supabase/client";

import { createChat } from "./components/actions";

const previewButtons = [
  {
    text: "Product categories",
    input: "A list of product categories with image, name and description.",
  },
  {
    text: "Hero section",
    input:
      "A landing page hero section with a heading, leading text and an opt-in form.",
  },
  {
    text: "Contact form",
    input:
      "A contact form with first name, last name, email, and message fields. Put the form in a card with a submit button.",
  },
  {
    text: "Ecommerce dashboard",
    input:
      "An ecommerce dashboard with a sidebar navigation and a table of recent orders.",
  },
];

// Add this array of additional prompt ideas
const additionalPromptIdeas = [
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
    text: "Navigation bar",
    input:
      "A sticky header with animated dropdown menus, search bar, and responsive behavior that transforms into a drawer on mobile.",
  },
  {
    text: "FAQ accordion",
    input:
      "An expandable FAQ section with smooth animations, search functionality and categorized questions.",
  },
  {
    text: "Image gallery",
    input:
      "A responsive masonry image gallery with lightbox preview, filtering capabilities and lazy loading.",
  },
  {
    text: "Stats dashboard",
    input:
      "An analytics dashboard with interactive charts, data tables and customizable date range selectors.",
  },
  {
    text: "User profile",
    input:
      "A user profile page with avatar upload, editable personal information and activity timeline.",
  },
];

// Ajoutez cette constante pour gérer les badges et les états désactivés
const frameworkConfig = {
  [Framework.REACT]: { icon: SiReact, badge: null, disabled: false },
  [Framework.VUE]: { icon: SiVuedotjs, badge: "Beta", disabled: false },
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
  const [image, setImage] = useState<File | null>(null);
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
  const [showPromptIdeasModal, setShowPromptIdeasModal] = useState(false);

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
          if (file && file.size <= maxImageSize) {
            setImage(file);
          } else {
            toast({
              variant: "destructive",
              title: "Image too large",
              description: `The image must be less than ${maxImageSize / (1024 * 1024)} Mo.`,
              duration: 4000,
            });
          }
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
    // Charger le statut de l'abonnement au chargement du composant
    const fetchSubscription = async () => {
      try {
        setIsLoadingSubscription(true);
        const { data } = await supabase.auth.getUser();
        setIsLoggedIn(!!data?.user?.id);
        const sub = await getSubscription();
        setSubscription(sub);
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setIsLoadingSubscription(false);
      }
    };

    fetchSubscription();
  }, []);

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.[0]) {
        return;
      }
      const file = e.target.files[0];

      if (file.size > maxImageSize) {
        toast({
          variant: "destructive",
          title: "Image too large",
          description: `The image must be less than ${maxImageSize / (1024 * 1024)} Mo.`,
          duration: 4000,
        });
        return;
      }

      setImage(file);
    },
    [toast],
  );

  const isRestrictedWebsite = (url: string): string | null => {
    const restrictedDomains = [
      { pattern: /\.gov(\.|$|\/)/, reason: "Government websites" },
      { pattern: /\.gouv(\.|$|\/)/, reason: "Government websites" },
      { pattern: /\.mil(\.|$|\/)/, reason: "Military websites" },
      { pattern: /\.police(\.|$|\/)/, reason: "Law enforcement websites" },
      { pattern: /\.bank(\.|$|\/)/, reason: "Banking websites" },
      { pattern: /\.edu(\.|$|\/)/, reason: "Educational institution websites" },
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

    let finalPrompt = prompt;

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

      // Format the prompt for website cloning
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
    if (image) {
      formData.append("file", image as File);
    }
    formData.append("isVisible", isVisible.toString());
    formData.append("theme", selectedTheme);
    formData.append("framework", selectedFramework);
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
  };

  const handleButtonClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleImageRemove = () => {
    setImage(null);
    if (fileInputRef.current) {
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
    <Container className="relative flex min-h-full w-auto flex-col items-center justify-center space-y-4 overflow-hidden pr-2 sm:pr-11">
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
      <div className="flex w-full flex-col items-center space-y-1.5">
        <h2
          className="text-4xl font-medium tracking-tighter sm:text-5xl"
          data-testid="home-h2"
        >
          Create. <span className="text-primary">Refine.</span> Deliver.
        </h2>
        <p className="text-center font-normal">
          {generationMode === "scratch" ? (
            <>
              Build{" "}
              <span className="font-semibold">responsive Tailwind sites</span>{" "}
              with
              <span className="font-semibold"> AI-powered</span> prompts and
              images.
            </>
          ) : (
            <>
              <span className="font-semibold">Clone any website</span> by URL
              and get a <span className="font-semibold">Tailwind-ready</span>{" "}
              version instantly.
            </>
          )}
        </p>
      </div>
      <form
        id="generate-form"
        className="group relative z-10 flex w-full flex-col items-center justify-center gap-x-0 space-y-3 rounded-lg border border-primary/40 bg-secondary p-3 text-center transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 xl:w-3/4"
        onSubmit={handleSubmit}
      >
        <Tabs
          defaultValue="scratch"
          className="w-full"
          onValueChange={(value) =>
            setGenerationMode(value as "scratch" | "clone")
          }
        >
          <TabsList className="mb-3 w-full">
            <TabsTrigger value="scratch" className="w-1/2 p-2">
              Generate from scratch
            </TabsTrigger>
            <TabsTrigger
              value="clone"
              className="w-1/2 p-2"
              disabled={selectedFramework === Framework.HTML}
            >
              Clone a website
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scratch" className="h-32 w-full">
            <div className="flex size-full flex-col items-end">
              <div className="flex w-full items-start">
                <Terminal className="mx-2 my-3 size-4" />
                <div className="relative w-full">
                  <TextareaWithLimit
                    ref={inputRef}
                    placeholder="Start generating a beautiful Tailwind component"
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
                    className="max-h-[400px] min-h-[76px] bg-secondary pl-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>
              <div
                className={cn(
                  "my-0.5 text-xs text-foreground transition-opacity",
                  prompt.length <= 3 && "opacity-0",
                )}
              >
                Use <kbd className="rounded-sm bg-background p-1">Shift</kbd> +{" "}
                <kbd className="rounded-sm bg-background p-1">Return</kbd> for a
                new line
              </div>
            </div>
          </TabsContent>

          <TabsContent value="clone" className="h-32 max-h-40 w-full">
            <div className="flex w-full flex-col items-end">
              <div className="flex w-full items-start">
                <Link2 className="mx-2 my-3 size-4" />
                <div className="relative w-full">
                  <Input
                    type="url"
                    placeholder="Enter website URL to clone (e.g., https://example.com)"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="bg-secondary pl-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex w-full flex-1 items-center justify-between lg:flex-row">
          {image && (
            <div className="mr-2 size-12">
              <div className="relative size-12">
                <Image
                  src={URL.createObjectURL(image)}
                  alt="Uploaded"
                  width={12}
                  height={12}
                  crossOrigin="anonymous"
                  className="size-12 rounded-md object-cover"
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 cursor-pointer rounded-full bg-black/50 p-1"
                  onClick={handleImageRemove}
                >
                  <XIcon className="size-4 text-white" />
                </button>
              </div>
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
                <TabsList isReverse={true} className="grid w-full grid-cols-2">
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
              <ImageSelector
                fileInputRef={fileInputRef}
                disabled={loading}
                handleButtonClick={handleButtonClick}
                handleImageChange={handleImageChange}
                isReverse={true}
              />
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
                    <SheetTitle className="mb-4">Component Theme</SheetTitle>
                    <div>
                      <h3 className="mb-1 text-base font-semibold">
                        Set theme for the component
                      </h3>
                      <h4 className="mb-4 text-sm">
                        Selected theme:{" "}
                        <span className="text-primary">{selectedTheme}</span>
                      </h4>
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          {themes.map((theme) => (
                            <div
                              key={theme}
                              className={cn(
                                "relative aspect-video cursor-pointer rounded-md items-center justify-center border-2 opacity-75 hover:border-2 hover:border-primary hover:opacity-100 overflow-hidden",
                                {
                                  "border-primary opacity-100":
                                    selectedTheme === theme,
                                },
                              )}
                              onClick={() => {
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
              <Select
                disabled={loading}
                defaultValue="react"
                onValueChange={(value) => {
                  setSelectedFramework(value as Framework);
                  // Reset to "Generate from scratch" if HTML is selected
                  if (value === Framework.HTML) {
                    setGenerationMode("scratch");
                  }
                }}
              >
                <SelectTrigger className="w-full rounded-md border-background sm:w-auto">
                  <SelectValue
                    className="mr-2"
                    placeholder="Select a framework"
                  />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Framework)
                    .filter(
                      (framework) =>
                        // Filter out HTML when in clone mode
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
                            config.disabled && "cursor-not-allowed opacity-50",
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
                          onClick={() => setShowPromptIdeasModal(true)}
                        >
                          <Lightbulb className="size-4" />
                          <span className="sr-only">Prompt ideas</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Prompt ideas</TooltipContent>
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
                          <WandSparkles
                            className={cn(
                              "size-4",
                              loadingAction === "improve" && "animate-spin",
                              hasImproved && "text-primary",
                            )}
                          />
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
              <Button
                type="submit"
                size="sm"
                variant="default"
                className="w-full lg:w-auto"
                disabled={loading}
              >
                <Rocket className="size-4" />
                {loadingAction === "generate" ? "Generating..." : "Generate"}
              </Button>
            </div>
          </div>
        </div>
      </form>
      <Dialog open={showCloneModal} onOpenChange={handleCloneModalClose}>
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
            <Button variant="outline" onClick={handleCloneModalClose}>
              Cancel
            </Button>
            <Button onClick={handleAgreeAndContinue} disabled={!agreeToTerms}>
              Agree & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={showPromptIdeasModal}
        onOpenChange={setShowPromptIdeasModal}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prompt Ideas</DialogTitle>
            <DialogDescription>
              Select one of these ideas to get inspired for your next component
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center justify-center gap-3 py-4">
            {previewButtons
              .concat(additionalPromptIdeas)
              .map((button, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  onClick={() => {
                    handleBadgeClick(button.input);
                    setShowPromptIdeasModal(false);
                  }}
                  className="cursor-pointer px-3 py-2 text-sm hover:bg-secondary"
                >
                  {button.text}
                </Badge>
              ))}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowPromptIdeasModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Container>
  );
}
