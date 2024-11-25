import Logo from "@/components/icons/logo";
import { Alert } from "@/components/ui/alert";

import AuthUI from "./auth-ui";

export const metadata = {
  title: `Login - Tailwind AI`,
};

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ emailSent?: string }>;
}) {
  const { emailSent } = await searchParams;
  return (
    <div className="flex h-screen justify-center">
      <div className="m-auto flex w-80 max-w-lg flex-col justify-between p-3 ">
        <div className="flex justify-center pb-12 ">
          <Logo className="w-16" />
        </div>
        {emailSent && (
          <Alert className="my-2">
            A magic link has been sent to your email address
          </Alert>
        )}
        <AuthUI />
      </div>
    </div>
  );
}
