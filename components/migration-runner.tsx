"use client";

import {
  Database,
  Eye,
  Copy,
  CheckCircle2,
  FileCode,
  Play,
  Loader2,
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
import { useToast } from "@/hooks/use-toast";

interface MigrationRunnerProps {
  migrationFile: {
    name: string;
    content: string;
  };
  chatId: string;
}

export function MigrationRunner({
  migrationFile,
  chatId,
}: MigrationRunnerProps) {
  const [showSQL, setShowSQL] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [migrationSuccess, setMigrationSuccess] = useState(false);
  const { toast } = useToast();

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
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to run migration");
      }

      setMigrationSuccess(true);
      toast({
        title: "Migration Successful! 🎉",
        description: `Successfully created ${tables.length} table${tables.length !== 1 ? "s" : ""} in your Supabase database`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Migration Failed",
        description:
          error instanceof Error ? error.message : "Failed to run migration",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Alert className="border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950">
      <Database className="size-4 text-blue-600" />
      <AlertTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
        Database Migration Detected
      </AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-3 break-words ">
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="break-words font-medium">{migrationFile.name}</p>
            <div className="mt-1 flex gap-4 text-blue-600 dark:text-blue-300">
              {tables.length > 0 && (
                <span className="flex items-center gap-1">
                  <FileCode className="size-3" />
                  Tables: {tables.join(", ")}
                </span>
              )}
              {policies.length > 0 && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="size-3" />
                  {policies.length} RLS{" "}
                  {policies.length === 1 ? "Policy" : "Policies"}
                </span>
              )}
            </div>
          </div>

          {!migrationSuccess && (
            <div className="rounded-md bg-blue-100 p-3 dark:bg-blue-900">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                💡 Quick Options:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-blue-800 dark:text-blue-200">
                <li>Click "Run Migration" to apply automatically</li>
                <li>
                  Or copy SQL and paste in Supabase Dashboard → SQL Editor
                </li>
              </ul>
            </div>
          )}
          {migrationSuccess && (
            <div className="rounded-md bg-green-100 p-3 dark:bg-green-900">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                ✅ Migration applied successfully!
              </p>
              <p className="mt-1 text-xs text-green-800 dark:text-green-200">
                Your database tables are ready to use.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSQL(true)}
              className="flex-1"
            >
              <Eye className="mr-2 size-4" />
              View SQL
            </Button>
            <Button
              size="sm"
              onClick={handleRunMigration}
              disabled={isRunning || migrationSuccess}
              className="flex-1"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Running...
                </>
              ) : migrationSuccess ? (
                <>
                  <CheckCircle2 className="mr-2 size-4" />
                  Applied
                </>
              ) : (
                <>
                  <Play className="mr-2 size-4" />
                  Run Migration
                </>
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopySQL}>
              {copied ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </AlertDescription>

      <Dialog open={showSQL} onOpenChange={setShowSQL}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="size-5" />
              {migrationFile.name}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[500px]">
            <pre className="rounded-md bg-muted p-4 text-sm">
              <code>{migrationFile.content}</code>
            </pre>
          </ScrollArea>
          <div className="flex justify-end">
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
