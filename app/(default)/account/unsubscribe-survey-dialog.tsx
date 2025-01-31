"use client";
import { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const UnsubscribeSurveyDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    mainreason: '',
    otherreason: '',
    improvementsuggestion: '',
  });
  const [email, setEmail] = useState('');
  const [portalUrl, setPortalUrl] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      const userResponse = await fetch('/api/get-user');
      const userData = await userResponse.json();
      setEmail(userData.email);

      const portalResponse = await fetch('/api/create-portal-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const portalData = await portalResponse.json();
      setPortalUrl(portalData.url);
    };

    fetchUserData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Log the unsubscribe reason
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit survey');
      }

      // Redirect to the Stripe portal URL
      router.push(portalUrl);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
      alert('Failed to submit survey: ' + (error as Error).message);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Unsubscribe</Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-bold mb-4">
            We're Sorry to See You Go
          </AlertDialogTitle>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Label className="font-medium">What's the main reason for unsubscribing?</Label>
            <RadioGroup
              value={formData.mainreason}
              onValueChange={(value) => setFormData({ ...formData, mainreason: value })}
              className="space-y-2"
            >
              <div className="flex items-center">
                <RadioGroupItem value="too-expensive" id="too-expensive" />
                <Label htmlFor="too-expensive" className="ml-2">Too expensive</Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="missing-features" id="missing-features" />
                <Label htmlFor="missing-features" className="ml-2">Missing features</Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="not-useful" id="not-useful" />
                <Label htmlFor="not-useful" className="ml-2">Not useful enough for my workflow</Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="component-quality" id="component-quality" />
                <Label htmlFor="component-quality" className="ml-2">Component quality</Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other" className="ml-2">Other</Label>
              </div>
            </RadioGroup>
            {formData.mainreason && (
              <Textarea
                value={formData.otherreason}
                onChange={(e) => setFormData({ ...formData, otherreason: e.target.value })}
                className="h-20 mt-2"
                placeholder="More information"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Any suggestions for improvement?</Label>
            <Textarea
              value={formData.improvementsuggestion}
              onChange={(e) => setFormData({ ...formData, improvementsuggestion: e.target.value })}
              className="h-20"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={loading}
            >
              {loading ? "Processing..." : "Confirm Unsubscribe"}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UnsubscribeSurveyDialog;
