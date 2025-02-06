import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

// Function to format the date
const formatDate = (dateString: string) => {
  const [day, month, year] = dateString.split("/"); // Split the date into day, month, and year
  const date = new Date(`${month}/${day}/${year}`); // Create a Date object
  return date.toLocaleDateString("en-US", {
    // Format the date to "Month Day, Year"
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default function Changelog({
  futureWork,
  changelog,
}: {
  futureWork: { title: string; content: string }[];
  changelog: { date: string; title: string; content: string }[];
}) {
  return (
    <div className="mx-auto max-w-screen-md p-8">
      {/* What We're Working On */}
      <div className="mb-16">
        <h1 className="mb-1 text-3xl font-bold">What We&apos;re Working On</h1>
        <div className="space-y-6">
          <p className="mb-6">
            We&apos;d love to hear your feedback! Share your thoughts and{" "}
            <b>get free time</b> added to your subscription as a thank you!{" "}
            <b>🎉</b>
          </p>
          <div className="rounded-lg border bg-card">
            <div className="space-y-4 p-4">
              {futureWork.map((item, index) => (
                <p key={index}>
                  <b>{item.title}:</b> {item.content}
                </p>
              ))}
            </div>
          </div>
          <Button id="openChat">Share your thoughts</Button>
        </div>
      </div>

      {/* Changelog */}
      <div className="mb-12">
        <h1 className="mb-1 text-3xl font-bold">Changelog</h1>
        <p className="mb-6">
          Keep track of the latest changes and improvements in our application.
        </p>

        <Accordion
          type="single"
          defaultValue="latest"
          className="mt-8 space-y-4"
        >
          {changelog.map((item, index) => (
            <AccordionItem
              key={index}
              value={`changelog-${index}`}
              className="rounded-lg border bg-card"
            >
              <AccordionTrigger className="flex w-full items-center justify-between p-4 hover:no-underline">
                <div className="flex w-full justify-between">
                  <span className="ml-4 font-bold">{item.title}</span>
                  <span className="pr-2 font-semibold">
                    {formatDate(item.date)}
                  </span>{" "}
                  {/* Format the date */}
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-t p-4">
                {item.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
