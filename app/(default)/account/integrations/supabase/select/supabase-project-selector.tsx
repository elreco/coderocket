"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";

interface Project {
  id: string;
  name: string;
  region: string;
  organization_id: string;
  status: string;
}

interface SupabaseProjectSelectorProps {
  projects: Project[];
  accessToken: string;
  userId: string;
}

export default function SupabaseProjectSelector({
  projects,
  accessToken,
  userId,
}: SupabaseProjectSelectorProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleConfirm = async () => {
    if (!selectedProjectId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a project",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        "/api/integrations/supabase/complete-integration",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId: selectedProjectId,
            accessToken,
            userId,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to complete integration",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Success",
        description: "Supabase integration completed successfully",
      });

      router.push("/account/integrations?success=supabase_connected");
    } catch (error) {
      console.error("Error completing integration:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to complete integration",
      });
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select a Supabase Project</CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose which Supabase project you want to integrate with your account
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={selectedProjectId}
          onValueChange={setSelectedProjectId}
        >
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent"
            >
              <RadioGroupItem value={project.id} id={project.id} />
              <Label
                htmlFor={project.id}
                className="flex flex-1 cursor-pointer flex-col"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{project.name}</span>
                  {project.status === "ACTIVE_HEALTHY" && (
                    <CheckCircle2 className="size-4 text-green-500" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {project.id} • {project.region}
                </span>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => router.push("/account/integrations")}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedProjectId || isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect Project"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
