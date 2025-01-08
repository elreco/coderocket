import { ChevronRight, File, Folder } from "lucide-react";
import * as React from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarRail,
} from "@/components/ui/sidebar";

// This is sample data.
const data = [
  [
    "app",
    [
      "api",
      ["hello", ["route.ts"]],
      "page.tsx",
      "layout.tsx",
      ["blog", ["page.tsx"]],
    ],
  ],
  ["components", ["ui", "button.tsx", "card.tsx"], "header.tsx", "footer.tsx"],
  ["lib", ["util.ts"]],
  ["public", "favicon.ico", "vercel.svg"],
  ".eslintrc.json",
  ".gitignore",
  "next.config.js",
  "tailwind.config.js",
  "package.json",
  "README.md",
];

export function CodePreviewFileTree({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return data.map((item, index) => <Tree key={index} item={item} />);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Tree({ item }: { item: string | any[] }) {
  const [name, ...items] = Array.isArray(item) ? item : [item];

  if (!items.length) {
    return (
      <div className="flex items-center gap-2 py-1 data-[active=true]:bg-transparent">
        <File />
        {name}
      </div>
    );
  }

  return (
    <Collapsible
      className="group/collapsible py-2 [&[data-state=open]>button>svg:first-child]:rotate-90"
      defaultOpen={name === "components" || name === "ui"}
    >
      <CollapsibleTrigger className="flex items-center gap-2">
        <ChevronRight className="transition-transform" />
        <Folder />
        {name}
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-8">
        {items.map((subItem, index) => (
          <Tree key={index} item={subItem} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
