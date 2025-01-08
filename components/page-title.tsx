export function PageTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <>
      <h1 className="text-lg font-medium sm:text-left sm:text-2xl">{title}</h1>
      <h2 className="mb-8 text-lg text-primary sm:text-left sm:text-xl">
        {subtitle}
      </h2>
    </>
  );
}
