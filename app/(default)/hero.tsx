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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Add validation for empty prompt
    if (!prompt.trim()) {
      toast({
        variant: "destructive",
        title: "Prompt required",
        description: "Please enter a prompt to generate a component.",
        duration: 4000,
      });
      return;
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
    const { slug, error } = await createChat(prompt, formData);
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
    setPrompt("");
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
          Build fully responsive{" "}
          <span className="font-semibold">Tailwind websites</span> effortlessly
          using <span className="font-semibold">AI-powered</span> text prompts
          and image inputs.
        </p>
      </div>
      <form
        id="generate-form"
        className="group relative z-10 flex w-full flex-col items-center justify-center gap-x-0 space-y-3 rounded-lg border border-primary/40 bg-secondary p-3 text-center transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 xl:w-3/4"
        onSubmit={handleSubmit}
      >
        <div className="flex w-full flex-col items-end">
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
            <kbd className="rounded-sm bg-background p-1">Return</kbd> for a new
            line
          </div>
        </div>
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
                onValueChange={(value) =>
                  setSelectedFramework(value as Framework)
                }
              >
                <SelectTrigger className="w-full rounded-md border-background sm:w-auto">
                  <SelectValue
                    className="mr-2"
                    placeholder="Select a framework"
                  />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Framework).map((framework) => {
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
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="w-full hover:bg-background lg:w-auto"
                disabled={loading || hasImproved}
                onClick={handleImprovePrompt}
              >
                <WandSparkles className="size-3" />
                {loadingAction === "improve"
                  ? "Improving prompt..."
                  : hasImproved
                    ? "Prompt improved"
                    : "Improve prompt"}
              </Button>
              <Button
                type="submit"
                size="sm"
                variant="default"
                className="w-full lg:w-auto"
                disabled={loading}
              >
                <Rocket className="size-3" />
                {loadingAction === "generate" ? "Generating..." : "Generate"}
              </Button>
            </div>
          </div>
        </div>
      </form>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {previewButtons.map((button, index) => (
          <Badge
            key={index}
            variant="secondary"
            onClick={() => handleBadgeClick(button.input)}
            className="whitespace-nowrap"
          >
            {button.text}
          </Badge>
        ))}
      </div>
    </Container>
  );
}
