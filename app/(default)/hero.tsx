"use client";
import {
  SiHtml5,
  SiReact,
  SiVuedotjs,
  SiSvelte,
  SiNextdotjs,
} from "@icons-pack/react-simple-icons";
import {
  Image as LucideImage,
  X,
  Wand,
  Terminal,
  Paintbrush,
  Globe,
  Lock,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";

import { Container } from "@/components/container";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { defaultTheme, maxImageSize, themes } from "@/utils/config";
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

export default function Hero() {
  const supabase = createClient();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [isVisible, setVisible] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState(defaultTheme);
  const [selectedFramework, setSelectedFramework] = useState("react");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) {
      return;
    }
    const file = e.target.files[0];

    if (file.size > maxImageSize) {
      toast({
        variant: "destructive",
        title: "Image too large",
        description: `The image must be less than ${maxImageSize / (1024 * 1024)} Mo.`,
        duration: 5000,
      });
      return;
    }

    setImage(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
        duration: 5000,
      });
      setLoading(false);
      return;
    }
    router.push(`/components/${slug}`);
    return;
  };

  const handleBadgeClick = (input: string) => {
    setPrompt(input);
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

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
        duration: 5000,
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
        duration: 5000,
      });
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
        <p className="font-normal">
          Design UI with Tailwind from basic text prompts and images.
        </p>
      </div>
      <form
        id="generate-form"
        className="group relative z-10 flex w-full flex-col items-center justify-center gap-x-0 space-y-3 rounded-lg border border-primary/35 bg-secondary p-3 text-center transition-all duration-300 hover:shadow-2xl hover:shadow-primary/35 xl:w-3/4"
        onSubmit={handleSubmit}
      >
        <div className="flex w-full flex-col items-end">
          <div className="flex w-full items-start">
            <Terminal className="mx-2 my-3 size-4" />
            <Textarea
              ref={inputRef}
              placeholder="Start generating a beautiful Tailwind component"
              autoFocus={true}
              required
              value={prompt}
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
              onChange={(e) => setPrompt(e.target.value)}
              className="max-h-[400px] min-h-[76px] bg-secondary pl-1 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
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
                  <X className="size-4 text-white" />
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
                    <Globe className="block size-4 lg:hidden" />
                    <span className="hidden lg:block">Public</span>
                  </TabsTrigger>
                  <TabsTrigger
                    isReverse={true}
                    value="private"
                    disabled={loading}
                  >
                    <Lock className="block size-4 lg:hidden" />
                    <span className="hidden lg:block">Private</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="background"
                    className="w-full lg:w-auto"
                    size="sm"
                    type="button"
                    disabled={loading}
                    onClick={handleButtonClick}
                  >
                    <LucideImage className="size-3" />
                    <span>Image</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Upload an image to generate a component with it</p>
                </TooltipContent>
              </Tooltip>
              {selectedFramework === "html" && (
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
                onValueChange={setSelectedFramework}
              >
                <SelectTrigger className="w-full border-background sm:w-auto">
                  <SelectValue
                    className="mr-2"
                    placeholder="Select a framework"
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="react" className="cursor-pointer">
                    <div className="mr-2 flex w-full flex-row items-center justify-between">
                      <div className="flex items-center">
                        <SiReact className="mr-2 size-3" />
                        <span className="text-sm">React</span>
                      </div>
                      <Badge variant="secondary" className="mr-1 text-xs">
                        Beta
                      </Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="html" className="cursor-pointer">
                    <div className="mr-2 flex cursor-pointer flex-row items-center">
                      <SiHtml5 className="mr-2 size-3" />
                      <span className="text-sm">HTML</span>
                    </div>
                  </SelectItem>
                  <SelectItem
                    value="nextjs"
                    className="cursor-not-allowed opacity-50"
                    disabled
                    onSelect={(e) => e.preventDefault()}
                  >
                    <div className="pointer-events-none mr-2 flex w-full flex-row items-center justify-between">
                      <div className="flex items-center">
                        <SiNextdotjs className="mr-2 size-3" />
                        <span className="text-sm">Next.js</span>
                      </div>
                      <Badge variant="outline" className="ml-0.5 mr-1 text-xs">
                        Soon
                      </Badge>
                    </div>
                  </SelectItem>
                  <SelectItem
                    value="svelte"
                    className="cursor-not-allowed opacity-50"
                    disabled
                    onSelect={(e) => e.preventDefault()}
                  >
                    <div className="pointer-events-none mr-2 flex w-full flex-row items-center justify-between">
                      <div className="flex items-center">
                        <SiSvelte className="mr-2 size-3" />
                        <span className="text-sm">Svelte</span>
                      </div>
                      <Badge variant="outline" className="ml-2 text-xs">
                        Soon
                      </Badge>
                    </div>
                  </SelectItem>
                  <SelectItem
                    value="vue"
                    className="cursor-not-allowed opacity-50"
                    disabled
                    onSelect={(e) => e.preventDefault()}
                  >
                    <div className="pointer-events-none mr-2 flex w-full flex-row items-center justify-between">
                      <div className="flex items-center">
                        <SiVuedotjs className="mr-2 size-3" />
                        <span className="text-sm">Vue</span>
                      </div>
                      <Badge variant="outline" className="ml-0.5 mr-1 text-xs">
                        Soon
                      </Badge>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-full items-center justify-end space-x-0 lg:space-x-2">
              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept=".png, .jpeg, .jpg, .gif, .webp"
                onChange={handleImageChange}
              />
              <Button
                type="submit"
                size="sm"
                variant="default"
                className="w-full lg:w-auto"
                loading={loading}
              >
                <Wand className="size-3" />
                Generate
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
