"use client";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Container } from "@/components/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster/use-toast";
import { maxPromptLength } from "@/utils/config";
import { createClient } from "@/utils/supabase/client";

import { createChat } from "./chats/actions";

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

  const router = useRouter();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user?.id) {
      setLoading(false);
      toast({
        variant: "destructive",
        title: "You must Log In",
        description: "Log in to your account to start generate components",
      });
      return router.push("/signin");
    }
    const formData = new FormData();
    if (image) {
      formData.append("file", image as File);
    }
    try {
      await createChat(prompt, formData);
    } catch (e) {
      console.log(e);
      toast({
        variant: "destructive",
        title: "Can't create your component",
        description: "Please upload a different image or try another prompt",
      });
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

  return (
    <Container className="bg-hero flex min-h-[calc(100vh-49px)] flex-col items-center justify-center space-y-4 !pt-0">
      <div className="flex w-full flex-col items-center space-y-1.5">
        <h2
          className="text-4xl font-medium tracking-tighter sm:text-5xl"
          data-testid="home-h2"
        >
          Create. Refine. Deliver.
        </h2>
        <p>Design UI with Tailwind from basic text prompts and images.</p>
      </div>
      <form
        className="group relative z-10 flex w-full flex-col items-center justify-center gap-x-0 space-y-5 rounded-lg bg-gray-900 p-3 text-center shadow-lg shadow-black/40 backdrop-blur-xl transition-all duration-300 sm:gap-x-3 sm:space-y-0 xl:w-1/2"
        onSubmit={handleSubmit}
      >
        <div className="mb-1 flex w-full">
          <Input
            placeholder="Start generate a beautiful Tailwind component"
            autoFocus
            required
            color="dark"
            value={prompt}
            minLength={2}
            maxLength={maxPromptLength}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        <div className="flex w-full flex-1 items-center justify-between">
          <div className="size-12">
            {image && (
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
                  <XMarkIcon className="size-4 text-white" />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button type="button" onClick={handleButtonClick}>
              <PhotoIcon className="mr-2 size-4 " />
              <span>Image</span>
            </Button>
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              onChange={handleImageChange}
            />

            <Button type="submit" loading={loading}>
              Generate
            </Button>
          </div>
        </div>
      </form>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {previewButtons.map((button, index) => (
          <Badge
            key={index}
            variant="secondary"
            onClick={() => handleBadgeClick(button.input)}
            className="cursor-pointer whitespace-nowrap hover:bg-gray-700"
          >
            {button.text}
          </Badge>
        ))}
      </div>
    </Container>
  );
}
