import { createClient } from './server'
import { createClient as createBrowserClient } from './client'

// Server-side authentication utilities
export async function getUser() {
  const supabase = createClient()
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Error getting user:', error)
      return null
    }
    
    return user
  } catch (error) {
    console.error('Error in getUser:', error)
    return null
  }
}

export async function getSession() {
  const supabase = createClient()
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting session:', error)
      return null
    }
    
    return session
  } catch (error) {
    console.error('Error in getSession:', error)
    return null
  }
}

// Client-side authentication utilities
export function signIn(email: string, password: string) {
  const supabase = createBrowserClient()
  return supabase.auth.signInWithPassword({ email, password })
}

export function signUp(email: string, password: string) {
  const supabase = createBrowserClient()
  return supabase.auth.signUp({ email, password })
}

export function signOut() {
  const supabase = createBrowserClient()
  return supabase.auth.signOut()
}

// Helper function to check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const user = await getUser()
  return !!user
}

// Get user ID for database operations
export async function getUserId(): Promise<string | null> {
  const user = await getUser()
  return user?.id || null
}
