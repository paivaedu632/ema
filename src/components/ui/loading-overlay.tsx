'use client'

interface LoadingOverlayProps {
  isVisible: boolean
  className?: string
}

/**
 * Full-page loading overlay component
 * Covers the entire viewport with a clean white background
 * and displays a centered loading spinner only
 */
export function LoadingOverlay({
  isVisible,
  className = ""
}: LoadingOverlayProps) {
  if (!isVisible) return null

  return (
    <div className={`fixed inset-0 z-50 bg-white flex items-center justify-center ${className}`}>
      {/* Simple loading spinner */}
      <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
    </div>
  )
}
