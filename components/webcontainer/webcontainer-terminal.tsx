import "@xterm/xterm/css/xterm.css";

import { Terminal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { useWebcontainer } from "@/context/webcontainer-context";

export function WebcontainerTerminal() {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const { terminal } = useWebcontainer();
  const [isVisible, setIsVisible] = useState(true);
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
  return (
    <div className="flex w-full flex-col items-center justify-center">
      <Collapsible open={isVisible} className="max-h-[200px] w-full">
        <div className="flex w-full items-center justify-between bg-secondary px-2 py-0.5">
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
