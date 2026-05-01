import { SiGithub } from "@icons-pack/react-simple-icons";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { discordLink } from "@/utils/config";
import { buildDocsUrl, githubRepoUrl } from "@/utils/runtime-config";

import Logo from "./icons/logo";

export function AppFooter() {
  return (
    <footer className="border-border mx-auto mt-20 w-full max-w-7xl rounded-lg border bg-secondary">
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-between sm:gap-4">
          <div className="flex shrink-0 flex-col items-center gap-2 sm:items-start">
            <div className="flex items-center gap-2">
              <Logo
                className="group-hover/link:hidden"
                src="/logo-alternate.png"
              />
              <span className="text-sm font-semibold text-foreground">
                CodeRocket
              </span>
            </div>
            <a
              href={githubRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:border-primary/40 hover:bg-primary/5 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors"
            >
              <SiGithub className="size-3.5" />
              Now open source
              <ExternalLink className="size-3" />
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:flex-nowrap sm:justify-center">
            <Link
              href="/privacy"
              className="text-foreground hover:text-primary shrink-0 whitespace-nowrap text-xs font-normal transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-foreground hover:text-primary shrink-0 whitespace-nowrap text-xs font-normal transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/cookies"
              className="text-foreground hover:text-primary shrink-0 whitespace-nowrap text-xs font-normal transition-colors"
            >
              Cookies
            </Link>
            <a
              href={discordLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-normal transition-colors"
            >
              Discord
              <ExternalLink className="size-3" />
            </a>
            <a
              href={buildDocsUrl("/")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-normal transition-colors"
            >
              Docs
              <ExternalLink className="size-3" />
            </a>
            <a
              href={githubRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-normal transition-colors"
            >
              GitHub
              <ExternalLink className="size-3" />
            </a>
            <Link
              href="/"
              className="text-foreground hover:text-primary shrink-0 whitespace-nowrap text-xs font-normal transition-colors"
            >
              Generate
            </Link>
          </div>
          <span className="text-foreground shrink-0 whitespace-nowrap text-xs font-semibold">
            © {new Date().getFullYear()} CodeRocket
          </span>
        </div>
      </div>
    </footer>
  );
}
