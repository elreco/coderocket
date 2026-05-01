import { spawn } from "node:child_process";

const commands = [
  {
    name: "app",
    args: ["run", "dev"],
    cwd: process.cwd(),
  },
  {
    name: "builder",
    args: ["run", "builder:dev"],
    cwd: process.cwd(),
  },
];

if (process.argv.includes("--docs")) {
  commands.push({
    name: "docs",
    args: ["run", "docs:dev"],
    cwd: process.cwd(),
  });
}

const children = commands.map((command) => {
  const child = spawn("npm", command.args, {
    cwd: command.cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[${command.name}] exited with code ${code}`);
      shutdown(code);
    }
  });

  return child;
});

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => process.exit(exitCode), 50);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
