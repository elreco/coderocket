"use client";

import {
  Database,
  Eye,
  Copy,
  CheckCircle2,
  FileCode,
  Play,
  Loader2,
  WandSparkles,
} from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToastAction } from "@/components/ui/toast";
import { useComponentContext } from "@/context/component-context";
import { useToast } from "@/hooks/use-toast";

interface ExecutedMigration {
  name: string;
  executed_at: string;
}

interface MigrationRunnerProps {
  migrationFile: {
    name: string;
    content: string;
  };
  chatId: string;
  messageId: number;
  migrationsExecuted?: ExecutedMigration[] | null;
  isGenerating?: boolean;
}

export function MigrationRunner({
  migrationFile,
  chatId,
  messageId,
  migrationsExecuted: initialMigrationsExecuted,
  isGenerating = false,
}: MigrationRunnerProps) {
  const [showSQL, setShowSQL] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [migrationsExecuted, setMigrationsExecuted] = useState<
    ExecutedMigration[] | null | undefined
  >(initialMigrationsExecuted);
  const { toast } = useToast();
  const { handleSubmitToAI, setInput, authorized } = useComponentContext();

  const executedMigration = (migrationsExecuted || []).find(
    (m) => m.name === migrationFile.name,
  );
  const isMigrationExecuted = !!executedMigration;

  const tables = extractTables(migrationFile.content);
  const policies = extractPolicies(migrationFile.content);

  const handleCopySQL = async () => {
    try {
      await navigator.clipboard.writeText(migrationFile.content);
      setCopied(true);
      toast({
        title: "SQL Copied!",
        description: "Migration SQL has been copied to your clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Failed to copy SQL to clipboard",
      });
    }
  };

  const handleRunMigration = async () => {
    if (!chatId) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Chat ID is missing. Please refresh the page and try again.",
      });
      return;
    }

    if (!migrationFile.content) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Migration content is empty.",
      });
      return;
    }

    setIsRunning(true);
    try {
      const response = await fetch("/api/integrations/run-migration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId,
          sql: migrationFile.content,
          migrationName: migrationFile.name,
          messageId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to run migration");
      }

      setMigrationsExecuted(result.migrationsExecuted || []);
      toast({
        title: "Migration Successful! 🎉",
        description:
          tables.length > 0
            ? `Successfully created ${tables.length} table${tables.length !== 1 ? "s" : ""} in your Supabase database`
            : "Migration applied successfully to your Supabase database",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to run migration";
      toast({
        variant: "destructive",
        title: "Migration Failed",
        description: errorMessage,
        duration: 10000,
        action: authorized ? (
          <ToastAction
            altText="Fix with AI"
            onClick={() => {
              const fixPrompt = `Fix the following SQL migration error:\n\nMigration file: ${migrationFile.name}\n\nError: ${errorMessage}\n\nSQL content:\n${migrationFile.content}`;
              setInput(fixPrompt);
              handleSubmitToAI(fixPrompt);
            }}
          >
            <WandSparkles className="mr-1 size-3" />
            Fix with AI
          </ToastAction>
        ) : undefined,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Alert
      data-migration-runner
      className="border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950"
    >
      <Database className="size-4 text-blue-600" />
      <AlertTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
        Database Migration Detected
      </AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-3 wrap-break-word ">
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium wrap-break-word">{migrationFile.name}</p>
            <div className="mt-1 flex flex-col gap-4 text-blue-600 dark:text-blue-300">
              {tables.length > 0 && (
                <span className="flex items-center gap-1">
                  <FileCode className="size-4" />
                  Tables: {tables.join(", ")}
                </span>
              )}
              {policies.length > 0 && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="size-4" />
                  {policies.length} RLS{" "}
                  {policies.length === 1 ? "Policy" : "Policies"}
                </span>
              )}
            </div>
          </div>

          {!isMigrationExecuted && (
            <div className="rounded-md bg-blue-100 p-3 dark:bg-blue-900">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                💡 Quick Options:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-blue-800 dark:text-blue-200">
                <li>Click &quot;Run Migration&quot; to apply automatically</li>
                <li>
                  Or copy SQL and paste in Supabase Dashboard → SQL Editor
                </li>
              </ul>
            </div>
          )}
          {isMigrationExecuted && (
            <div className="rounded-md bg-green-100 p-3 dark:bg-green-900">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                ✅ Migration already applied!
              </p>
              <p className="mt-1 text-xs text-green-800 dark:text-green-200">
                Applied on{" "}
                {new Date(executedMigration!.executed_at).toLocaleString()}
              </p>
            </div>
          )}
          {isGenerating && (
            <div className="rounded-md bg-blue-100 p-3 dark:bg-blue-900">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                ⏳ Generation in progress...
              </p>
              <p className="mt-1 text-xs text-blue-800 dark:text-blue-200">
                Please wait for the generation to complete before running the
                migration.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              onClick={handleRunMigration}
              disabled={isRunning || isMigrationExecuted || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Wait for completion...
                </>
              ) : isRunning ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Running...
                </>
              ) : isMigrationExecuted ? (
                <>
                  <CheckCircle2 className="mr-2 size-4" />
                  Already Applied
                </>
              ) : (
                <>
                  <Play className="mr-2 size-4" />
                  Run Migration
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSQL(true)}
            >
              <Eye className="mr-2 size-4" />
              View SQL
            </Button>

            <Button size="sm" variant="outline" onClick={handleCopySQL}>
              {copied ? (
                <>
                  <CheckCircle2 className="mr-2 size-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 size-4" />
                  Copy SQL
                </>
              )}
            </Button>
          </div>
        </div>
      </AlertDescription>

      <Dialog open={showSQL} onOpenChange={setShowSQL}>
        <DialogContent className="w-[90vw] max-w-6xl! sm:max-w-6xl! h-[90vh] flex flex-col overflow-hidden p-0">
          <div className="shrink-0 px-6 pt-6 pb-4 border-b">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Database className="size-5 shrink-0" />
                <span className="truncate">{migrationFile.name}</span>
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden px-6 py-4">
            <ScrollArea className="h-full rounded-md border">
              <div className="p-4">
                <pre className="text-sm">
                  <code className="whitespace-pre-wrap wrap-break-word font-mono block">
                    {migrationFile.content}
                  </code>
                </pre>
              </div>
            </ScrollArea>
          </div>
          <div className="shrink-0 flex justify-end px-6 pt-4 pb-6 border-t">
            <Button onClick={handleCopySQL}>
              {copied ? (
                <>
                  <CheckCircle2 className="mr-2 size-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 size-4" />
                  Copy SQL
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Alert>
  );
}

function extractTables(sql: string): string[] {
  const matches = sql.matchAll(
    /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)/gi,
  );
  return Array.from(matches, (m) => m[1]);
}

function extractPolicies(sql: string): string[] {
  const matches = sql.matchAll(/create\s+policy\s+"([^"]+)"/gi);
  return Array.from(matches, (m) => m[1]);
}
