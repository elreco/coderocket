import Logo from "@/components/icons/logo";

import AuthUIMagicLink from "./auth-ui-magic-link";

export default async function MagicLink() {
  return (
    <div className="flex h-screen justify-center">
      <div className="m-auto flex w-80 max-w-lg flex-col justify-between p-3 ">
        <div className="flex justify-center pb-12 ">
          <Logo className="w-16" />
        </div>
        <AuthUIMagicLink />
      </div>
    </div>
  );
}
