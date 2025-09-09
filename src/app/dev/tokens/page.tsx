// Clerk removed - using Supabase Auth
import { redirect } from 'next/navigation';
import TokenExtractor from '@/components/dev/token-extractor';

export default async function TokensPage() {
  const { userId } = await auth();

  // Redirect to sign-in if not authenticated
  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔧 EmaPay Development Tools
          </h1>
          <p className="text-gray-600">
            Extract JWT tokens and test API endpoints for development purposes.
          </p>
        </div>

        <div className="space-y-6">
          <TokenExtractor />
          
          {/* Additional Development Info */}
          <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📚 Available API Endpoints
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">🔐 Protected Endpoints:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <code>/api/v1/auth/me</code> - Get user info</li>
                  <li>• <code>/api/v1/wallets/balance</code> - Get wallet balance</li>
                  <li>• <code>/api/v1/wallets/[currency]</code> - Get specific wallet</li>
                  <li>• <code>/api/v1/users/search</code> - Search users</li>
                  <li>• <code>/api/v1/transfers/send</code> - Send transfer</li>
                  <li>• <code>/api/v1/transfers/history</code> - Transfer history</li>
                  <li>• <code>/api/v1/orders/limit</code> - Create limit order</li>
                  <li>• <code>/api/v1/orders/market</code> - Create market order</li>
                  <li>• <code>/api/v1/orders/history</code> - Order history</li>
                  <li>• <code>/api/v1/security/pin</code> - Set PIN</li>
                  <li>• <code>/api/v1/security/pin/verify</code> - Verify PIN</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-800 mb-2">🌐 Public Endpoints:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <code>/api/v1/health/status</code> - System health</li>
                  <li>• <code>/api/v1/market/summary</code> - Market data</li>
                  <li>• <code>/api/v1/market/depth</code> - Order book</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
