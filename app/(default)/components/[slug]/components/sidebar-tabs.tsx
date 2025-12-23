"use client";

import {
  BookOpen,
  Github,
  MessageSquare,
  Plug2,
  Rocket,
  Settings,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Framework } from "@/utils/config";

interface SidebarTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isLoading: boolean;
  authorized: boolean;
  selectedFramework: Framework;
}

export function SidebarTabsMobile({
  activeTab,
  onTabChange,
  isLoading,
  authorized,
  selectedFramework,
}: SidebarTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        if (!isLoading) {
          onTabChange(value);
        }
      }}
      className="w-full xl:hidden"
    >
      <TabsList
        className={cn(
          "grid w-full rounded-none",
          authorized
            ? selectedFramework === Framework.HTML
              ? "grid-cols-5"
              : "grid-cols-6"
            : "grid-cols-2",
        )}
      >
        <TabsTrigger value="chat" disabled={isLoading}>
          <MessageSquare className="size-4" />
        </TabsTrigger>
        <TabsTrigger value="history" disabled={isLoading}>
          <BookOpen className="size-4" />
        </TabsTrigger>
        {authorized && (
          <TabsTrigger value="github" disabled={isLoading}>
            <Github className="size-4" />
          </TabsTrigger>
        )}
        {authorized && selectedFramework !== Framework.HTML && (
          <TabsTrigger value="integrations" disabled={isLoading}>
            <Plug2 className="size-4" />
          </TabsTrigger>
        )}
        {authorized && (
          <TabsTrigger value="deployment" disabled={isLoading}>
            <Rocket className="size-4" />
          </TabsTrigger>
        )}
        {authorized && (
          <TabsTrigger value="settings" disabled={isLoading}>
            <Settings className="size-4" />
          </TabsTrigger>
        )}
      </TabsList>
    </Tabs>
  );
}

export function SidebarTabsDesktop({
  activeTab,
  onTabChange,
  isLoading,
  authorized,
  selectedFramework,
}: SidebarTabsProps) {
  return (
    <div className="bg-background hidden h-full w-14 flex-col space-y-4 p-2 xl:flex">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-10 w-full rounded-lg",
          activeTab === "chat" && "bg-secondary text-primary",
        )}
        onClick={() => !isLoading && onTabChange("chat")}
        disabled={isLoading}
      >
        <MessageSquare className="size-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-10 w-full rounded-lg",
          activeTab === "history" && "bg-secondary text-primary",
        )}
        onClick={() => !isLoading && onTabChange("history")}
        disabled={isLoading}
      >
        <BookOpen className="size-5" />
      </Button>
      {authorized && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-full rounded-lg",
            activeTab === "github" && "bg-secondary text-primary",
          )}
          onClick={() => !isLoading && onTabChange("github")}
          disabled={isLoading}
        >
          <Github className="size-5" />
        </Button>
      )}
      {authorized && selectedFramework !== Framework.HTML && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-full rounded-lg",
            activeTab === "integrations" && "bg-secondary text-primary",
          )}
          onClick={() => !isLoading && onTabChange("integrations")}
          disabled={isLoading}
        >
          <Plug2 className="size-5" />
        </Button>
      )}
      {authorized && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-full rounded-lg",
            activeTab === "deployment" && "bg-secondary text-primary",
          )}
          onClick={() => !isLoading && onTabChange("deployment")}
          disabled={isLoading}
        >
          <Rocket className="size-5" />
        </Button>
      )}
      {authorized && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-full rounded-lg",
            activeTab === "settings" && "bg-secondary text-primary",
          )}
          onClick={() => !isLoading && onTabChange("settings")}
          disabled={isLoading}
        >
          <Settings className="size-5" />
        </Button>
      )}
    </div>
  );
}
