// Clerk removed - using Supabase Auth

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <SignIn
          appearance={{
            elements: {
              formButtonPrimary: "bg-black hover:bg-gray-800 text-white",
              card: "shadow-none border border-gray-200",
            }
          }}
          fallbackRedirectUrl="/dashboard"
          signUpUrl="/signup"
        />
      </div>
    </div>
  )
}
