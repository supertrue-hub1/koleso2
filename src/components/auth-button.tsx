"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

export function AuthButton() {
  const { isSignedIn } = useUser();

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-sm hover:underline">
          Админ
        </Link>
        <UserButton />
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <Link
        href="/sign-in"
        className="px-4 py-2 text-sm hover:underline"
      >
        Вход
      </Link>
      <Link
        href="/sign-up"
        className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
      >
        Регистрация
      </Link>
    </div>
  );
}
