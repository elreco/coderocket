import "@xterm/xterm/css/xterm.css";

import { SiHtml5 } from "@icons-pack/react-simple-icons";
import { SiReact } from "@icons-pack/react-simple-icons";
import { Terminal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { useComponentContext } from "@/context/component-context";
import { useWebContainer } from "@/context/webcontainer-context";

import { Badge } from "../ui/badge";

export function WebContainerTerminal() {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const { terminal } = useWebContainer();
  const [isVisible, setIsVisible] = useState(true);
  const { selectedFramework, isLoading } = useComponentContext();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const setupTerminal = async () => {
      if (isMounted && terminalRef.current && terminal) {
        terminal.open(terminalRef.current);
        const { FitAddon } = await import("@xterm/addon-fit");
        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        window.addEventListener("resize", () => {
          fitAddon.fit();
          terminal.resize(terminal.cols, terminal.rows);
        });
        fitAddon.fit();
      }
    };
    setupTerminal();
  }, [terminal, isMounted]);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };
  const FrameworkIcon =
    selectedFramework?.toLowerCase() === "react" ? SiReact : SiHtml5;
  return (
    <div className="flex w-full flex-col items-center justify-center">
      <Collapsible open={isVisible} className="max-h-[200px] w-full">
        <div className="flex w-full items-center justify-between bg-secondary px-2 py-0.5">
          {!isLoading && selectedFramework && (
            <Badge className="hover:bg-primary">
              <FrameworkIcon className="mr-1 size-3" />
              <span className="first-letter:uppercase">
                {selectedFramework}
              </span>
            </Badge>
          )}
          <Button
            onClick={toggleVisibility}
            variant="outline"
            size="sm"
            className="flex items-center justify-center"
          >
            <Terminal className="mr-0.5" />
            {isVisible ? "Hide Terminal" : "Show Terminal"}
          </Button>
        </div>
        <CollapsibleContent className="size-full">
          <div
            className="h-[180px] w-full"
            ref={terminalRef}
            style={{ display: isVisible ? "block" : "none" }}
          ></div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
