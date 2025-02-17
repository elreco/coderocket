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
  const [isUserScrollingUp, setIsUserScrollingUp] = useState(false); // Suivi du scroll utilisateur

  useEffect(() => {
    const setupTerminal = async () => {
      if (terminalRef.current && terminal) {
        terminal.open(terminalRef.current);
        const { FitAddon } = await import("@xterm/addon-fit");
        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);

        window.addEventListener("resize", () => {
          fitAddon.fit();
          if (!isUserScrollingUp) terminal.scrollToBottom();
        });

        fitAddon.fit();
      }
    };

    setupTerminal();
  }, [terminal]);

  useEffect(() => {
    if (terminal) {
      const terminalElement = terminal.element; // Accès à l'élément DOM du terminal
      if (!terminalElement) return;

      const handleScroll = () => {
        const scrollPosition = terminal.buffer.active.baseY; // Position actuelle du scroll
        const maxScroll = terminal.buffer.active.length - terminal.rows;

        if (scrollPosition < maxScroll - 1) {
          setIsUserScrollingUp(true); // L'utilisateur scrolle vers le haut
        } else {
          setIsUserScrollingUp(false); // L'utilisateur est en bas
        }
      };

      terminalElement.addEventListener("wheel", handleScroll); // Écoute l'événement de scroll

      return () => {
        terminalElement.removeEventListener("wheel", handleScroll);
      };
    }
  }, [terminal]);

  useEffect(() => {
    if (terminalRef.current) {
      const observer = new MutationObserver(() => {
        if (terminal && !isUserScrollingUp) {
          // On scrolle en bas SEULEMENT si l'utilisateur n'est pas en train de scroller vers le haut
          setTimeout(() => {
            terminal.scrollToBottom();
          }, 50);
        }
      });

      observer.observe(terminalRef.current, {
        attributes: true,
        childList: true,
        subtree: true,
      });

      return () => observer.disconnect();
    }
  }, [terminal, isUserScrollingUp]);

  const toggleVisibility = () => {
    setIsVisible((prev) => !prev);
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
