"use client"

import React from "react"
import Select, { components } from "react-select"
import { Country } from "country-state-city"

interface CountrySelectorProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}

// Custom flag component for country selector (without overflow-hidden)
const CountryFlag = ({ countryCode, className = "w-5 h-5" }: { countryCode: string; className?: string }) => {
  const flagUrl = `https://flagicons.lipis.dev/flags/4x3/${countryCode.toLowerCase()}.svg`

  return (
    <div className={`rounded-full ${className} flex-shrink-0`}>
      <img
        src={flagUrl}
        alt={`${countryCode.toUpperCase()} flag`}
        className="w-full h-full object-cover rounded-full"
      />
    </div>
  )
}

// Get all countries and format them for react-select
const countries = Country.getAllCountries().map((country) => ({
  value: country.isoCode,
  label: country.name,
  countryCode: country.isoCode.toLowerCase(), // For flag component
}))

// Custom option component to display flag and country name
const CustomOption = (props: any) => {
  const { data } = props
  return (
    <components.Option {...props}>
      <div className="flex items-center gap-3">
        <CountryFlag countryCode={data.countryCode} className="w-6 h-6" />
        <span>{data.label}</span>
      </div>
    </components.Option>
  )
}

// Custom single value component to display selected flag and country
const CustomSingleValue = (props: any) => {
  const { data } = props
  return (
    <components.SingleValue {...props}>
      <div className="flex items-center gap-2">
        <CountryFlag countryCode={data.countryCode} className="w-6 h-6" />
        <span>{data.label}</span>
      </div>
    </components.SingleValue>
  )
}

export function CountrySelector({
  value,
  onValueChange,
  placeholder = "Selecione um país",
  className
}: CountrySelectorProps) {
  const selectedCountry = countries.find((country) => country.value === value)

  return (
    <Select
      value={selectedCountry}
      onChange={(option) => onValueChange(option?.value || "")}
      options={countries}
      placeholder={placeholder}
      isSearchable
      components={{
        Option: CustomOption,
        SingleValue: CustomSingleValue,
      }}
      styles={{
        control: (base, state) => ({
          ...base,
          height: "40px",
          minHeight: "40px",
          border: state.isFocused ? "2px solid #000" : "1px solid #d1d5db",
          borderRadius: "6px",
          boxShadow: "none",
          "&:hover": {
            border: state.isFocused ? "2px solid #000" : "1px solid #000",
          },
        }),
        valueContainer: (base) => ({
          ...base,
          padding: "0 12px",
          display: "flex",
          alignItems: "center",
        }),
        singleValue: (base) => ({
          ...base,
          margin: "0",
          maxWidth: "calc(100% - 8px)",
        }),
        input: (base) => ({
          ...base,
          margin: "0",
          padding: "0",
        }),
        indicatorSeparator: () => ({
          display: "none",
        }),
        dropdownIndicator: (base) => ({
          ...base,
          color: "#6b7280",
          "&:hover": {
            color: "#374151",
          },
        }),
        menu: (base) => ({
          ...base,
          border: "1px solid #d1d5db",
          borderRadius: "6px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        }),
        menuList: (base) => ({
          ...base,
          padding: "4px",
        }),
        option: () => ({
          // Custom styling handled in CustomOption component
        }),
      }}
      className={className}
    />
  )
}
