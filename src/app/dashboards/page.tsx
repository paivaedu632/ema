'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Monitor, 
  Smartphone, 
  Eye, 
  Code, 
  Palette,
  BarChart3,
  Users,
  Wallet,
  ArrowRight
} from 'lucide-react'

export default function DashboardsPage() {
  const dashboardVariants = [
    {
      id: 'desktop',
      title: 'Desktop Dashboard',
      description: 'Full-featured desktop dashboard with comprehensive analytics, charts, and detailed transaction management.',
      href: '/mock-dashboard',
      icon: <Monitor className="h-8 w-8" />,
      features: [
        'Comprehensive balance overview',
        'Advanced analytics charts',
        'Detailed transaction history',
        'Quick action buttons',
        'Multi-currency support',
        'Real-time statistics'
      ],
      preview: '/api/placeholder/600/400',
      color: 'bg-blue-500'
    },
    {
      id: 'mobile',
      title: 'Mobile Dashboard',
      description: 'Mobile-optimized dashboard designed for touch interfaces with simplified navigation and key features.',
      href: '/mobile-dashboard',
      icon: <Smartphone className="h-8 w-8" />,
      features: [
        'Touch-optimized interface',
        'Simplified navigation',
        'Quick balance view',
        'Essential actions only',
        'Swipe gestures support',
        'Responsive design'
      ],
      preview: '/api/placeholder/300/600',
      color: 'bg-green-500'
    },
    {
      id: 'binance',
      title: 'Binance-Style Dashboard',
      description: 'Professional crypto exchange interface inspired by Binance with advanced trading features and asset management.',
      href: '/binance-dashboard',
      icon: <BarChart3 className="h-8 w-8" />,
      features: [
        'Professional sidebar navigation',
        'Advanced asset management table',
        'Crypto-style balance display',
        'Transaction history with hashes',
        'Multi-currency support',
        'Exchange-grade UI components'
      ],
      preview: '/api/placeholder/800/500',
      color: 'bg-yellow-500'
    }
  ]

  const mockDataFeatures = [
    {
      icon: <Wallet className="h-5 w-5" />,
      title: 'Realistic Wallet Balances',
      description: 'EUR and AOA currencies with change indicators'
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      title: 'Transaction History',
      description: 'Complete transaction records with status tracking'
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: 'User Profiles',
      description: 'Verified user accounts with KYC status'
    },
    {
      icon: <Eye className="h-5 w-5" />,
      title: 'Privacy Controls',
      description: 'Balance visibility toggle and secure display'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">EmaPay Dashboards</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Mock Dashboard Showcase
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Explore our comprehensive dashboard implementations with realistic mock data. 
            Built using the new clean architecture with modern React patterns and shadcn/ui components.
          </p>
        </div>

        {/* Dashboard Variants */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 mb-12">
          {dashboardVariants.map((variant) => (
            <Card key={variant.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`p-2 rounded-lg ${variant.color} text-white`}>
                    {variant.icon}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{variant.title}</CardTitle>
                  </div>
                </div>
                <p className="text-gray-600">{variant.description}</p>
              </CardHeader>
              <CardContent>
                {/* Preview placeholder */}
                <div className="bg-gray-100 rounded-lg p-8 mb-6 text-center">
                  <div className="text-gray-400 mb-2">
                    {variant.id === 'desktop' ? <Monitor className="h-16 w-16 mx-auto" /> : <Smartphone className="h-16 w-16 mx-auto" />}
                  </div>
                  <p className="text-sm text-gray-500">Dashboard Preview</p>
                </div>

                {/* Features */}
                <div className="space-y-2 mb-6">
                  {variant.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="h-1.5 w-1.5 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>

                <Link href={variant.href}>
                  <Button className="w-full">
                    View {variant.title}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mock Data Features */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl flex items-center space-x-2">
              <Code className="h-5 w-5" />
              <span>Mock Data Features</span>
            </CardTitle>
            <p className="text-gray-600">
              Both dashboards include comprehensive mock data to demonstrate real-world functionality
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {mockDataFeatures.map((feature, index) => (
                <div key={index} className="text-center">
                  <div className="bg-blue-100 p-3 rounded-lg w-fit mx-auto mb-3">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-sm mb-2">{feature.title}</h3>
                  <p className="text-xs text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center space-x-2">
              <Palette className="h-5 w-5" />
              <span>Technical Implementation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Architecture</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Clean frontend structure</li>
                  <li>• Feature-based organization</li>
                  <li>• TypeScript throughout</li>
                  <li>• Modern React patterns</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">UI Components</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• shadcn/ui components</li>
                  <li>• Tailwind CSS styling</li>
                  <li>• Lucide React icons</li>
                  <li>• Responsive design</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Mock Data</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Realistic user profiles</li>
                  <li>• Multi-currency balances</li>
                  <li>• Transaction history</li>
                  <li>• Status indicators</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
