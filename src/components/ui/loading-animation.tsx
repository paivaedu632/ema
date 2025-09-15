'use client'

interface LoadingAnimationProps {
  message?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function LoadingAnimation({
  message,
  size = 'md',
  className = ''
}: LoadingAnimationProps) {
  // Size configurations
  const sizeConfig = {
    sm: { width: 32, height: 32, textSize: 'text-sm' },
    md: { width: 40, height: 40, textSize: 'text-base' },
    lg: { width: 48, height: 48, textSize: 'text-lg' },
    xl: { width: 56, height: 56, textSize: 'text-xl' }
  }

  const config = sizeConfig[size]

  // Simple clean loading animation
  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      {/* Simple spinning circle */}
      <div
        className="animate-spin rounded-full border-2 border-gray-300 border-t-black"
        style={{ width: config.width, height: config.height }}
      />
      {/* Only show text if message is provided */}
      {message && (
        <p className={`text-gray-900 font-medium ${config.textSize}`}>{message}</p>
      )}
    </div>
  )
}
