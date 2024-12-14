"use client";
import {
  Lock,
  Unlock,
  Image as LucideImage,
  X,
  Wand,
  Terminal,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";

import { Container } from "@/components/container";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spotlight } from "@/components/ui/spotlight";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { maxImageSize, maxPromptLength } from "@/utils/config";
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
  const [loading, setLoading] = useState(false);
  const [loadingVisibility, setLoadingVisibility] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

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
    try {
      const { id, error } = await createChat(prompt, formData);
      if (error) {
        toast({
          variant: "destructive",
          title: error.title,
          description: error.description,
          duration: 5000,
        });
        return;
      }
      router.push(`/components/${id}`);
      return;
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "You must be logged in and have a premium plan to create a component.",
        duration: 5000,
      });
      setLoading(false);
    }
    setLoading(false);
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
    setLoadingVisibility(true);
    const { data } = await supabase.auth.getSession();
    if (!data?.session?.user?.id) {
      toast({
        variant: "destructive",
        title: "Premium account required",
        description:
          "You are not logged in, the visibility cannot be changed. Please login and upgrade to premium and try again.",
        duration: 5000,
      });
      setLoadingVisibility(false);
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
    setLoadingVisibility(false);
  };

  return (
    <Container className="relative flex min-h-full w-auto flex-col items-center justify-center space-y-4 pr-2 sm:pr-11">
      <AnimatedGridPattern
        numSquares={80}
        maxOpacity={0.1}
        duration={1}
        className={cn(
          "[mask-image:radial-gradient(500px_circle_at_center,hsl(var(--secondary)),transparent)]",
          "inset-x-0 inset-y-[-30%] h-[200%] skew-y-12 opacity-75",
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
        className="group relative z-10 flex w-full flex-col items-center justify-center gap-x-0 space-y-3 rounded-lg border bg-secondary p-3 text-center shadow-black/40 backdrop-blur-xl transition-all duration-300 xl:w-2/3"
        onSubmit={handleSubmit}
      >
        <div className="flex w-full items-center">
          <Terminal className="ml-1 size-4" />
          <Input
            ref={inputRef}
            placeholder="Start generating a beautiful Tailwind component"
            autoFocus={true}
            required
            value={prompt}
            minLength={2}
            maxLength={maxPromptLength}
            onChange={(e) => setPrompt(e.target.value)}
            className="bg-secondary pl-1 focus-visible:ring-0"
          />
        </div>
        <div className="flex w-full flex-1 items-center justify-between">
          {image && (
            <div className="mr-2 size-12">
              <div className="relative size-12">
                <Image
                  src={URL.createObjectURL(image)}
                  alt="Uploaded"
                  width={12}
                  height={12}
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
          <div className="flex w-full items-center justify-between">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="background"
                  onClick={handleVisibility}
                  className="flex items-center"
                  loading={loadingVisibility}
                  disabled={loading}
                  type="button"
                >
                  {isVisible ? (
                    <>
                      <Unlock className="mr-1 w-5" />
                      <span>Public</span>
                    </>
                  ) : (
                    <>
                      <Lock className="mr-1 w-5" />
                      <span>Private</span>
                    </>
                  )}
                </Button>
              </TooltipTrigger>

              <TooltipContent side="right">
                <p>{isVisible ? "Set private" : "Set public"}</p>
              </TooltipContent>
            </Tooltip>
            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="background"
                    type="button"
                    disabled={loading}
                    onClick={handleButtonClick}
                  >
                    <LucideImage className="mr-1 size-4" />
                    <span>Image</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Upload an image to generate a component with it</p>
                </TooltipContent>
              </Tooltip>
              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept=".png, .jpeg, .jpg, .gif, .webp"
                onChange={handleImageChange}
              />
              <Button type="submit" variant="default" loading={loading}>
                <Wand className="mr-1 size-4" />
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
