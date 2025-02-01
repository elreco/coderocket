"use client";
import { useState, useEffect } from 'react';
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
import { createClient } from "@/utils/supabase/client"; // Import Supabase client

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

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Initialize Supabase client
        const supabase = createClient();

        // Fetch the logged-in user's details
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          throw new Error('User not authenticated');
        }

        // Set the user's email
        if (user.email) {
          setEmail(user.email);
          console.log("Fetched Email:", user.email); // Log the email for debugging
        } else {
          throw new Error('Email not found for the user');
        }

        // Fetch the Stripe portal URL (optional for now)
        const portalResponse = await fetch('/api/create-portal-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const portalData = await portalResponse.json();
        if (!portalData.url) {
          throw new Error('Failed to fetch portal URL');
        }
        setPortalUrl(portalData.url);
      } catch (error) {
        console.error('Error fetching user data or portal URL:', error);
      }
    };

    fetchUserData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Include email in the form data
      const surveyData = {
        ...formData,
        email, // Use the email fetched from Supabase Auth
      };

      console.log("Submitting Survey Data:", surveyData); // Log the data for debugging

      // Log the unsubscribe reason
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(surveyData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit survey');
      }

      // Redirect to the Stripe portal URL (optional for now)
      if (portalUrl) {
        window.location.href = portalUrl;
      } else {
        throw new Error('Portal URL not found');
      }
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
      alert('Failed to submit survey: ' + (error as Error).message);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Cancel subscription</Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-bold mb-4">
            We're Sorry to See You Go
          </AlertDialogTitle>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Label className="font-medium">What's the main reason for cancelling your subscription?</Label>
            <RadioGroup
              value={formData.mainreason}
              onValueChange={(value) => setFormData({ ...formData, mainreason: value })}
              className="space-y-2"
            >
              <div className="flex items-center">
                <RadioGroupItem value="missing-features" id="missing-features" />
                <Label htmlFor="missing-features" className="ml-2">Missing features</Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="too-expensive" id="too-expensive" />
                <Label htmlFor="too-expensive" className="ml-2">Too expensive</Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="switched-to-better-tool" id="switched-to-better-tool" />
                <Label htmlFor="switched-to-better-tool" className="ml-2">Switched to a better tool</Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="dont-need-it-anymore" id="dont-need-it-anymore" />
                <Label htmlFor="dont-need-it-anymore" className="ml-2">Don’t need it anymore</Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="components-didnt-meet-expectations" id="components-didnt-meet-expectations" />
                <Label htmlFor="components-didnt-meet-expectations" className="ml-2">Components didn’t meet expectations</Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other" className="ml-2">Other</Label>
              </div>
            </RadioGroup>

            {/* Show the text box only after a reason is selected */}
            {formData.mainreason && (
              <Textarea
                value={formData.otherreason}
                onChange={(e) => setFormData({ ...formData, otherreason: e.target.value })}
                className="h-20 mt-4"
                placeholder="Any detail is greatly appreciated 🙏"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Any suggestions for improvement?</Label>
            <Textarea
              value={formData.improvementsuggestion}
              onChange={(e) => setFormData({ ...formData, improvementsuggestion: e.target.value })}
              className="h-20"
              placeholder="We truly value your feedback and take it seriously. Your thoughts help us improve. 🙏"
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
              {loading ? "Processing..." : "Submit"}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UnsubscribeSurveyDialog;