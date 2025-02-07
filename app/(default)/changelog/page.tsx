import React from "react";

import { Container } from "@/components/container";

import Changelog from "./changelog";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSdSBJHCyK6hywW5WSkUW989LWb1qc7ItXITTnHsYcL9enRa-9l4Ss4zxitY_sbE2E1UMOyyIUGPi09/pub?gid=865836860&single=true&output=csv";

export default async function ChangelogPage() {
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
    const columns = row.split(",");
    const date = columns[0]?.trim();
    const title = columns[1]?.trim();
    const content = columns[2]?.trim();
    const type = columns[3]?.trim().toLowerCase(); // Type: changelog or future

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
