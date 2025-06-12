"use client";

import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

export function ClerkAuth() {
  return (
    <div className="flex items-center gap-4">
      <SignedOut>
        <div className="flex gap-2">
          <SignInButton mode="modal">
            <button className="h-12 px-6 bg-black text-white rounded-full hover:bg-gray-800 transition-colors">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="h-12 px-6 border border-black text-black rounded-full hover:bg-gray-50 transition-colors">
              Sign Up
            </button>
          </SignUpButton>
        </div>
      </SignedOut>
      <SignedIn>
        <UserButton 
          appearance={{
            elements: {
              avatarBox: "w-10 h-10"
            }
          }}
        />
      </SignedIn>
    </div>
  );
}
