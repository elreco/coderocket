"use server";

export default async function RenderHtmlComponentServer({
  files,
  style,
}: {
  files: { name: string | null; content: string }[];
  style?: React.CSSProperties;
}) {
  const initialContent = files[0]?.content || "";

  return (
    <iframe
      srcDoc={initialContent}
      style={style}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
