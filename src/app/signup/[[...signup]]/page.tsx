import { SignUp } from "@clerk/nextjs"

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <SignUp
          appearance={{
            elements: {
              formButtonPrimary: "bg-black hover:bg-gray-800 text-white",
              card: "shadow-none border border-gray-200",
            }
          }}
          fallbackRedirectUrl="/dashboard"
          signInUrl="/login"
        />
      </div>
    </div>
  )
}
