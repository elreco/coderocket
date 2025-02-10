import { Nodebox, ShellProcess } from "@codesandbox/nodebox";
import React, { useEffect, useRef, useState } from "react";

import { useComponentContext } from "@/context/component-context";

export default function NodeboxContainer() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const { artifactFiles, isLoading } = useComponentContext();

  // We'll keep references to any "long-running" shells
  const [devShell, setDevShell] = useState<ShellProcess | null>(null);

  useEffect(() => {
    // Ensure the iframe is defined before starting
    let nodebox: Nodebox | null = null;
    let installShell: ShellProcess | null = null;

    const runNodebox = async () => {
      if (isLoading || !iframeRef.current || artifactFiles.length === 0) return;
      // 1) Create Nodebox instance & connect
      nodebox = new Nodebox({
        iframe: iframeRef.current,
      });

      await nodebox.connect();
      setLogs((prev) => [...prev, "✅ Nodebox connected"]);

      // 2) Initialize the FS with package.json, index.js, etc.
      const filesMap = artifactFiles.reduce((acc, file) => {
        if (file.name) {
          return { ...acc, [file.name]: file.content };
        }
        return acc;
      }, {});
      console.log(filesMap);
      await nodebox.fs.init(filesMap);
      setLogs((prev) => [...prev, "📁 FS initialized"]);

      // 3) Shell for "npm install"
      installShell = nodebox.shell.create();
      await installShell.runCommand("which", ["npm"]);
      // Example: using apt-get (if the environment has Debian/Ubuntu tooling)
      await installShell.runCommand("sudo", ["apt-get", "update"]);
      await installShell.runCommand("sudo", [
        "apt-get",
        "install",
        "-y",
        "npm",
      ]);

      installShell.stdout.on("data", (data) => {
        setLogs((prev) => [...prev, `[install:stdout] ${data}`]);
      });
      installShell.stderr.on("data", (data) => {
        setLogs((prev) => [...prev, `[install:stderr] ${data}`]);
      });
      setLogs((prev) => [...prev, "📦 Installing packages..."]);

      await installShell.runCommand("npm", ["install"]);
      setLogs((prev) => [...prev, "✅ npm install complete"]);

      // 4) Shell for "npm run dev" (long-running)
      const devShellLocal = nodebox.shell.create();
      setDevShell(devShellLocal); // store reference so we can kill it later if needed

      devShellLocal.stdout.on("data", (data) => {
        setLogs((prev) => [...prev, `[dev:stdout] ${data}`]);
      });
      devShellLocal.stderr.on("data", (data) => {
        setLogs((prev) => [...prev, `[dev:stderr] ${data}`]);
      });
      devShellLocal.on("exit", (code, error) => {
        setLogs((prev) => [...prev, `🔴 dev shell exited: code=${code}`]);
        if (error) {
          setLogs((prev) => [...prev, `[dev:stderr] ${error.message}`]);
        }
      });

      setLogs((prev) => [...prev, "🚀 Starting dev server..."]);
      // No "await" because dev server likely never exits on its own
      devShellLocal.runCommand("npm", ["run", "dev"]);
    };

    runNodebox();

    // Cleanup: kill any running shells
    return () => {
      // If devShell is still running, kill it
      devShell?.kill?.();
      // If installShell is still running, kill it
      installShell?.kill?.();
      // We don't have a direct "disconnect" or "terminate" on nodebox,
      // but removing the iframe or reassigning null helps remove references.
      nodebox = null;
    };
  }, [artifactFiles, isLoading]);

  return (
    <div style={{ display: "flex", gap: "1rem" }}>
      {/* The iframe Nodebox uses */}
      <iframe ref={iframeRef} className="size-full border-none" />

      {/* Logs */}
      <div className="size-full overflow-auto font-mono">
        <h3>Logs</h3>
        {logs.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}
