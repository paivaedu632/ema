"use client"

import React, { useEffect, useRef, useState } from "react"
import { Loader } from "@googlemaps/js-api-loader"
import { Search, MapPin, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"

/**
 * GooglePlacesInput Component
 *
 * A flexible Google Places Autocomplete input component that supports:
 * - Worldwide address search (default)
 * - Country-specific restrictions (optional)
 * - Geographic biasing for better local results
 *
 * Usage Examples:
 *
 * // Worldwide search (default)
 * <GooglePlacesInput value={address} onChange={setAddress} />
 *
 * // Restricted to specific country only
 * <GooglePlacesInput value={address} onChange={setAddress} countryCode="AO" restrictToCountry={true} />
 *
 * // Restricted to any other country
 * <GooglePlacesInput value={address} onChange={setAddress} countryCode="US" restrictToCountry={true} />
 */

interface GooglePlacesInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  countryCode?: string // For biasing results to specific country (optional)
  restrictToCountry?: boolean // Whether to restrict results to specific country only
}

export function GooglePlacesInput({
  value,
  onChange,
  placeholder = "Pesquisar endereço",
  className = "",
  countryCode, // Optional country code for restrictions only
  restrictToCountry = false // Default to worldwide search
}: GooglePlacesInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeGooglePlaces = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

        if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
          setError("Google Maps API key not configured")
          setIsLoading(false)
          return
        }

        const loader = new Loader({
          apiKey: apiKey,
          version: "weekly",
          libraries: ["places"]
        })

        await loader.load()
        setIsGoogleLoaded(true)
        setError(null)
      } catch (err) {
        setError("Failed to load Google Maps")
      } finally {
        setIsLoading(false)
      }
    }

    initializeGooglePlaces()
  }, [])

  useEffect(() => {
    if (isGoogleLoaded && inputRef.current && !autocompleteRef.current) {
      try {
        // Initialize autocomplete with flexible configuration
        const autocompleteOptions: google.maps.places.AutocompleteOptions = {
          types: ["address"],
          fields: ["formatted_address", "geometry", "address_components", "place_id"]
        }

        // Add country restrictions only if restrictToCountry is true
        if (restrictToCountry && countryCode) {
          autocompleteOptions.componentRestrictions = { country: countryCode.toLowerCase() }
        }

        autocompleteRef.current = new google.maps.places.Autocomplete(
          inputRef.current,
          autocompleteOptions
        )

        // Handle place selection
        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current?.getPlace()
          if (place?.formatted_address) {
            onChange(place.formatted_address)
          }
        })
      } catch {
        setError("Failed to initialize address search")
      }
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [isGoogleLoaded, onChange, countryCode, restrictToCountry])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  if (error) {
    // Fallback to regular input if Google Maps fails
    return (
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`form-input-auth pl-12 ${className}`}
        />
      </div>
    )
  }

  return (
    <div className="relative">
      {isLoading ? (
        <Loader2 className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
      ) : (
        <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      )}

      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={isLoading ? "Loading address search..." : placeholder}
        className={`form-input-auth pl-12 ${className}`}
        disabled={isLoading}
      />
    </div>
  )
}
