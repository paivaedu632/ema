'use client'

import { useEffect, useState } from 'react'
import Lottie from 'lottie-react'

interface LoadingAnimationProps {
  message?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function LoadingAnimation({ 
  message = "Carregando...", 
  size = 'md',
  className = '' 
}: LoadingAnimationProps) {
  const [animationData, setAnimationData] = useState(null)

  // Size configurations
  const sizeConfig = {
    sm: { width: 80, height: 80, textSize: 'text-sm' },
    md: { width: 120, height: 120, textSize: 'text-base' },
    lg: { width: 160, height: 160, textSize: 'text-lg' },
    xl: { width: 200, height: 200, textSize: 'text-xl' }
  }

  const config = sizeConfig[size]

  useEffect(() => {
    // Financial-themed loading animation with wallet/money elements
    const loadingAnimationData = {
      "v": "5.7.4",
      "fr": 30,
      "ip": 0,
      "op": 90,
      "w": 200,
      "h": 200,
      "nm": "WalletLoading",
      "ddd": 0,
      "assets": [],
      "layers": [
        // Outer rotating ring
        {
          "ddd": 0,
          "ind": 1,
          "ty": 4,
          "nm": "OuterRing",
          "sr": 1,
          "ks": {
            "o": { "a": 0, "k": 80 },
            "r": {
              "a": 1,
              "k": [
                { "i": { "x": [0.4], "y": [1] }, "o": { "x": [0.6], "y": [0] }, "t": 0, "s": [0] },
                { "t": 90, "s": [360] }
              ]
            },
            "p": { "a": 0, "k": [100, 100, 0] },
            "a": { "a": 0, "k": [0, 0, 0] },
            "s": { "a": 0, "k": [100, 100, 100] }
          },
          "ao": 0,
          "shapes": [
            {
              "ty": "gr",
              "it": [
                {
                  "d": 1,
                  "ty": "el",
                  "s": { "a": 0, "k": [90, 90] },
                  "p": { "a": 0, "k": [0, 0] }
                },
                {
                  "ty": "st",
                  "c": { "a": 0, "k": [0.2, 0.2, 0.2, 1] },
                  "o": { "a": 0, "k": 100 },
                  "w": { "a": 0, "k": 3 },
                  "lc": 2,
                  "lj": 2,
                  "d": [
                    { "n": "d", "nm": "dash", "v": { "a": 0, "k": 10 } },
                    { "n": "g", "nm": "gap", "v": { "a": 0, "k": 5 } }
                  ]
                },
                {
                  "ty": "tr",
                  "p": { "a": 0, "k": [0, 0] },
                  "a": { "a": 0, "k": [0, 0] },
                  "s": { "a": 0, "k": [100, 100] },
                  "r": { "a": 0, "k": 0 },
                  "o": { "a": 0, "k": 100 }
                }
              ]
            }
          ],
          "ip": 0,
          "op": 90,
          "st": 0
        },
        // Inner pulsing circle (wallet)
        {
          "ddd": 0,
          "ind": 2,
          "ty": 4,
          "nm": "WalletCore",
          "sr": 1,
          "ks": {
            "o": { "a": 0, "k": 100 },
            "r": { "a": 0, "k": 0 },
            "p": { "a": 0, "k": [100, 100, 0] },
            "a": { "a": 0, "k": [0, 0, 0] },
            "s": {
              "a": 1,
              "k": [
                { "i": { "x": [0.833], "y": [0.833] }, "o": { "x": [0.167], "y": [0.167] }, "t": 0, "s": [90, 90, 100] },
                { "i": { "x": [0.833], "y": [0.833] }, "o": { "x": [0.167], "y": [0.167] }, "t": 45, "s": [110, 110, 100] },
                { "t": 90, "s": [90, 90, 100] }
              ]
            }
          },
          "ao": 0,
          "shapes": [
            {
              "ty": "gr",
              "it": [
                {
                  "d": 1,
                  "ty": "el",
                  "s": { "a": 0, "k": [50, 50] },
                  "p": { "a": 0, "k": [0, 0] }
                },
                {
                  "ty": "fl",
                  "c": { "a": 0, "k": [0, 0, 0, 1] },
                  "o": { "a": 0, "k": 100 }
                },
                {
                  "ty": "tr",
                  "p": { "a": 0, "k": [0, 0] },
                  "a": { "a": 0, "k": [0, 0] },
                  "s": { "a": 0, "k": [100, 100] },
                  "r": { "a": 0, "k": 0 },
                  "o": { "a": 0, "k": 100 }
                }
              ]
            }
          ],
          "ip": 0,
          "op": 90,
          "st": 0
        }
      ]
    }

    setAnimationData(loadingAnimationData)
  }, [])

  if (!animationData) {
    // Enhanced CSS fallback with financial theme
    return (
      <div className={`flex flex-col items-center justify-center space-y-6 ${className}`}>
        <div className="relative" style={{ width: config.width, height: config.height }}>
          {/* Outer rotating ring */}
          <div
            className="absolute inset-0 rounded-full border-4 border-gray-200 border-t-black animate-spin"
            style={{
              width: config.width,
              height: config.height,
              borderStyle: 'dashed',
              animationDuration: '3s'
            }}
          />
          {/* Inner pulsing circle */}
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black rounded-full animate-pulse"
            style={{
              width: config.width * 0.25,
              height: config.height * 0.25,
              animationDuration: '2s'
            }}
          />
        </div>
        <p className={`text-gray-600 font-medium ${config.textSize}`}>{message}</p>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <Lottie
        animationData={animationData}
        style={{ width: config.width, height: config.height }}
        loop={true}
        autoplay={true}
      />
      <p className={`text-gray-600 ${config.textSize}`}>{message}</p>
    </div>
  )
}
