import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signInWithEmail } from "../actions";

export default function AuthUIMagicLink() {
  return (
    <form>
      <div className="grid gap-6">
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">
              Email
            </Label>
            <Input
              id="email"
              className="!border-gray-300 bg-white !text-gray-900"
              placeholder="name@example.com"
              type="email"
              name="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
            />
          </div>
          <Button variant="outline" formAction={signInWithEmail}>
            Send magic link
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="rounded-md bg-gray-900  px-2 text-white">Or</span>
          </div>
        </div>
        <Link href="/signin">
          <Button className="w-full" variant="outline" type="button">
            Back to login
          </Button>
        </Link>
      </div>
    </form>
  );
}
