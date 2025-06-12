"use client";

import { useUser } from "@clerk/nextjs";

export function UserProfile() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Not signed in</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">User Profile</h2>
      <div className="space-y-2">
        <p><strong>Name:</strong> {user.fullName || "Not provided"}</p>
        <p><strong>Email:</strong> {user.primaryEmailAddress?.emailAddress || "Not provided"}</p>
        <p><strong>Phone:</strong> {user.primaryPhoneNumber?.phoneNumber || "Not provided"}</p>
        <p><strong>User ID:</strong> {user.id}</p>
        <p><strong>Created:</strong> {user.createdAt?.toLocaleDateString()}</p>
      </div>
    </div>
  );
}
