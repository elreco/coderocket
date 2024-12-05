import Logo from "@/components/icons/logo";

import AuthUI from "./auth-ui";

export const metadata = {
  title: `Login - Tailwind AI`,
};

export default async function SignIn() {
  return (
    <div className="flex h-screen justify-center">
      <div className="m-auto flex w-80 max-w-lg flex-col justify-between p-3 ">
        <div className="flex justify-center pb-12 ">
          <Logo className="w-16" />
        </div>
        <AuthUI />
      </div>
    </div>
  );
}
