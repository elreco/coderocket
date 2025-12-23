"use client";

import {
  BookOpen,
  Github,
  MessageSquare,
  Plug2,
  Rocket,
  Settings,
} from "lucide-react";

import { Framework } from "@/utils/config";

interface TabHeaderProps {
  activeTab: string;
  authorized: boolean;
  selectedFramework: Framework;
}

export function TabHeader({
  activeTab,
  authorized,
  selectedFramework,
}: TabHeaderProps) {
  if (activeTab === "chat") {
    return (
      <div className="bg-background flex h-12 items-center gap-2 px-4 py-1.5">
        <MessageSquare className="size-4" />
        <h3 className="text-base font-medium">Chat</h3>
      </div>
    );
  }

  if (activeTab === "history") {
    return (
      <div className="bg-background flex h-12 items-center gap-2 px-4 py-1.5">
        <BookOpen className="size-4" />
        <h3 className="text-base font-medium">History</h3>
      </div>
    );
  }

  if (authorized && activeTab === "github") {
    return (
      <div className="bg-background flex h-12 items-center gap-2 px-4 py-1.5">
        <Github className="size-4" />
        <h3 className="text-base font-medium">GitHub Sync</h3>
      </div>
    );
  }

  if (
    authorized &&
    selectedFramework !== Framework.HTML &&
    activeTab === "integrations"
  ) {
    return (
      <div className="bg-background flex h-12 items-center gap-2 px-4 py-1.5">
        <Plug2 className="size-4" />
        <h3 className="text-base font-medium">Integrations</h3>
      </div>
    );
  }

  if (authorized && activeTab === "deployment") {
    return (
      <div className="bg-background flex h-12 items-center gap-2 px-4 py-1.5">
        <Rocket className="size-4" />
        <h3 className="text-base font-medium">Deployment</h3>
      </div>
    );
  }

  if (authorized && activeTab === "settings") {
    return (
      <div className="bg-background flex h-12 items-center gap-2 px-4 py-1.5">
        <Settings className="size-4" />
        <h3 className="text-base font-medium">Settings</h3>
      </div>
    );
  }

  return null;
}
