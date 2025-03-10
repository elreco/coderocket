import React from "react";

import { Container } from "@/components/container";

import Changelog from "./changelog";

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
    <Container>
      <Changelog futureWork={futureWorkData} changelog={changelogData} />
    </Container>
  );
}
