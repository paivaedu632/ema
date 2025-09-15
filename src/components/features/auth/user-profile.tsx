"use client";

// Clerk removed - using Supabase Auth
import { useState, useEffect } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function UserProfile() {
  const supabase = createClientSupabaseClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setIsLoaded(true);
    };
    getUser();
  }, [supabase.auth]);

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
        <p><strong>Name:</strong> {user.user_metadata?.full_name || "Not provided"}</p>
        <p><strong>Email:</strong> {user.email || "Not provided"}</p>
        <p><strong>Phone:</strong> {user.phone || "Not provided"}</p>
        <p><strong>User ID:</strong> {user.id}</p>
        <p><strong>Created:</strong> {user.created_at ? new Date(user.created_at).toLocaleDateString() : "Not provided"}</p>
      </div>
    </div>
  );
}
