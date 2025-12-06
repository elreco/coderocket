import React from "react";

import { AppFooter } from "@/components/app-footer";
import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";

import Changelog from "./changelog";

export const metadata = {
  title: "Changelog - CodeRocket AI Website Builder",
  description:
    "Latest updates, improvements, and new features for CodeRocket. Track new AI capabilities, framework support, integrations, and bug fixes for our Tailwind website builder.",
  keywords:
    "CodeRocket updates, AI builder changelog, new features, product updates, release notes",
  openGraph: {
    title: "CodeRocket Changelog - Latest Updates & Features",
    description:
      "Stay updated with the latest features, improvements, and fixes to CodeRocket AI website builder.",
    url: "https://www.coderocket.app/changelog",
  },
  alternates: {
    canonical: "https://www.coderocket.app/changelog",
  },
};

export default async function ChangelogPage() {
  const SHEET_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSdSBJHCyK6hywW5WSkUW989LWb1qc7ItXITTnHsYcL9enRa-9l4Ss4zxitY_sbE2E1UMOyyIUGPi09/pub?gid=865836860&single=true&output=csv";

  const response = await fetch(SHEET_CSV_URL);
  const csvText = await response.text();
  const rows = csvText.split("\n").slice(1);

  const changelogData: {
    date: string;
    title: string;
    content: string;
  }[] = [];
  const futureWorkData: { title: string; content: string }[] = [];

  rows.forEach((row) => {
    const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g;
    const columns = [];
    let match;

    while ((match = regex.exec(row)) !== null) {
      const value =
        (match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2]) ||
        "";
      columns.push(value.trim());
    }

    const date = columns[0] || "";
    const title = columns[1] || "";
    const content = columns[2] || "";
    const type = columns[3]?.toLowerCase().replace(/\r$/, "") || "";

    if (type === "changelog") {
      changelogData.push({ date, title, content });
    } else if (type === "future") {
      futureWorkData.push({ title, content });
    }
  });

  return (
    <Container className="my-2 size-auto pr-2 sm:pr-11">
      <PageTitle
        title="Changelog"
        subtitle="Track the latest updates and improvements"
      />

      <Changelog futureWork={futureWorkData} changelog={changelogData} />
      <AppFooter />
    </Container>
  );
}
