import { SiThreads } from "@icons-pack/react-simple-icons";
import { Copy, Share } from "lucide-react";
import {
  FacebookShareButton,
  TwitterShareButton,
  LinkedinShareButton,
  RedditShareButton,
  TelegramShareButton,
  WhatsappShareButton,
  EmailShareButton,
  FacebookIcon,
  XIcon,
  LinkedinIcon,
  RedditIcon,
  TelegramIcon,
  WhatsappIcon,
  EmailIcon,
} from "react-share";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tables } from "@/types_db";

interface ShareModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isVisible: boolean;
  shareLink: string;
  fetchedChat: Tables<"chats"> | null;
  lastAssistantMessage: Tables<"messages"> | null;
  onCopy: (text: string) => void;
}

export function ShareModal({
  isOpen,
  onOpenChange,
  isVisible,
  shareLink,
  fetchedChat,
  lastAssistantMessage,
  onCopy,
}: ShareModalProps) {
  const { toast } = useToast();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto sm:max-w-5xl">
        <div className="mb-6 flex flex-col items-center justify-center text-center">
          <Share className="text-primary mb-2 size-12" />
          <DialogTitle className="text-xl font-semibold text-white">
            Share Your Component
          </DialogTitle>
          <p className="text-muted-foreground">
            Let the world see your awesome creation! ✨
          </p>
        </div>
        <DialogDescription>
          {!isVisible ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">
                This component is currently private and cannot be shared.
              </p>
              <p className="text-sm text-muted-foreground">
                To share it, change its visibility to public in the settings.
              </p>
            </div>
          ) : (
            <div
              className={cn(
                "grid gap-6",
                lastAssistantMessage?.screenshot
                  ? "grid-cols-1 lg:grid-cols-2"
                  : "grid-cols-1",
              )}
            >
              <div className="space-y-6">
                <div>
                  <p className="mb-3 text-sm font-medium text-white">
                    Share on social media:
                  </p>
                  <div className="grid grid-cols-4 gap-x-3 gap-y-4">
                    <div className="flex flex-col items-center gap-2">
                      <TwitterShareButton
                        url={shareLink}
                        title={
                          fetchedChat?.title
                            ? `${fetchedChat.title} - Built with CodeRocket 🚀`
                            : "Check out this awesome component built with CodeRocket! 🚀"
                        }
                        hashtags={["CodeRocket", "TailwindCSS", "WebDev"]}
                        className="flex items-center justify-center rounded-full transition-transform hover:scale-110"
                      >
                        <XIcon size={48} round />
                      </TwitterShareButton>
                      <span className="text-xs text-white">X</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <FacebookShareButton
                        url={shareLink}
                        className="flex items-center justify-center rounded-full transition-transform hover:scale-110"
                      >
                        <FacebookIcon size={48} round />
                      </FacebookShareButton>
                      <span className="text-xs text-white">Facebook</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <LinkedinShareButton
                        url={shareLink}
                        title={
                          fetchedChat?.title
                            ? `${fetchedChat.title} - Built with CodeRocket`
                            : "Component built with CodeRocket"
                        }
                        summary="Check out this awesome component built with CodeRocket!"
                        className="flex items-center justify-center rounded-full transition-transform hover:scale-110"
                      >
                        <LinkedinIcon size={48} round />
                      </LinkedinShareButton>
                      <span className="text-xs text-white">LinkedIn</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <RedditShareButton
                        url={shareLink}
                        title={
                          fetchedChat?.title
                            ? `${fetchedChat.title} - Built with CodeRocket 🚀`
                            : "Check out this awesome component!"
                        }
                        className="flex items-center justify-center rounded-full transition-transform hover:scale-110"
                      >
                        <RedditIcon size={48} round />
                      </RedditShareButton>
                      <span className="text-xs text-white">Reddit</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <TelegramShareButton
                        url={shareLink}
                        title={
                          fetchedChat?.title
                            ? `${fetchedChat.title} - Built with CodeRocket 🚀`
                            : "Check out this awesome component!"
                        }
                        className="flex items-center justify-center rounded-full transition-transform hover:scale-110"
                      >
                        <TelegramIcon size={48} round />
                      </TelegramShareButton>
                      <span className="text-xs text-white">Telegram</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <WhatsappShareButton
                        url={shareLink}
                        title={
                          fetchedChat?.title
                            ? `${fetchedChat.title} - Built with CodeRocket 🚀`
                            : "Check out this awesome component!"
                        }
                        className="flex items-center justify-center rounded-full transition-transform hover:scale-110"
                      >
                        <WhatsappIcon size={48} round />
                      </WhatsappShareButton>
                      <span className="text-xs text-white">WhatsApp</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <EmailShareButton
                        url={shareLink}
                        subject={
                          fetchedChat?.title
                            ? `Check out ${fetchedChat.title} on CodeRocket!`
                            : "Check out this component on CodeRocket!"
                        }
                        body="I found this awesome component built with CodeRocket. Check it out!"
                        className="flex items-center justify-center rounded-full transition-transform hover:scale-110"
                      >
                        <EmailIcon size={48} round />
                      </EmailShareButton>
                      <span className="text-xs text-white">Email</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <button
                        onClick={() => {
                          const text = fetchedChat?.title
                            ? `${fetchedChat.title} - Built with CodeRocket 🚀\n${shareLink}`
                            : `Check out this awesome component built with CodeRocket! 🚀\n${shareLink}`;
                          const threadsUrl = `https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`;
                          window.open(threadsUrl, "_blank");
                        }}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-black transition-transform hover:scale-110"
                        aria-label="Share on Threads"
                      >
                        <SiThreads className="h-6 w-6 text-white" />
                      </button>
                      <span className="text-xs text-white">Threads</span>
                    </div>
                  </div>
                </div>
                <div className="border-border border-t pt-4">
                  <p className="mb-3 text-sm font-medium text-white">
                    Or copy the link:
                  </p>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      onClick={() => {
                        onCopy(shareLink);
                        toast({
                          variant: "default",
                          title: "Link copied",
                          description:
                            "The URL has been successfully copied to your clipboard",
                          duration: 3000,
                        });
                      }}
                      size="sm"
                    >
                      <Copy className="size-4" />
                      <span className="sr-only">Copy</span>
                    </Button>
                  </div>
                </div>
              </div>
              {lastAssistantMessage?.screenshot && (
                <img
                  src={lastAssistantMessage.screenshot}
                  alt={
                    fetchedChat?.title
                      ? `${fetchedChat.title} preview`
                      : "Component preview"
                  }
                  className="border-border flex items-center rounded-lg border h-auto w-full"
                />
              )}
            </div>
          )}
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
