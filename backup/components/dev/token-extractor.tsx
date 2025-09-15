'use client';

// Clerk removed - using Supabase Auth
import { useState } from 'react';

export default function TokenExtractor() {
  const { getToken, isSignedIn } = useAuth();
  const [token, setToken] = useState<string>('');
  const [apiResult, setApiResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const extractToken = async () => {
    if (!isSignedIn) {
      setToken('❌ Please sign in first');
      return;
    }

    try {
      setLoading(true);
      const jwtToken = await getToken();
      
      if (jwtToken) {
        setToken(jwtToken);
        console.log('🔐 JWT Token extracted:', jwtToken);
      } else {
        setToken('❌ No token available');
      }
    } catch (error) {
      setToken(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testAPI = async () => {
    if (!token || token.startsWith('❌')) {
      setApiResult('❌ No valid token available. Extract token first!');
      return;
    }

    try {
      setLoading(true);
      
      // Test the /auth/me endpoint
      const response = await fetch('/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setApiResult(`✅ API Test Successful!\n\n${JSON.stringify(data, null, 2)}`);
      } else {
        setApiResult(`❌ API Test Failed:\n\n${JSON.stringify(data, null, 2)}`);
      }
    } catch (error) {
      setApiResult(`❌ API Test Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    if (token && !token.startsWith('❌')) {
      navigator.clipboard.writeText(token);
      alert('✅ Token copied to clipboard!');
    } else {
      alert('❌ No valid token to copy');
    }
  };

  const testOtherEndpoints = async (endpoint: string) => {
    if (!token || token.startsWith('❌')) {
      setApiResult('❌ No valid token available. Extract token first!');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      setApiResult(`📡 ${endpoint}\n\nStatus: ${response.status}\n\n${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setApiResult(`❌ Error testing ${endpoint}: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          🔐 JWT Token Extractor
        </h3>
        <p className="text-yellow-700">
          Please sign in to extract your JWT token for API testing.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        🔐 JWT Token Extractor
      </h3>
      
      {/* Extract Token Button */}
      <div className="mb-4">
        <button
          onClick={extractToken}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 mr-2"
        >
          {loading ? '⏳ Loading...' : '🔍 Extract JWT Token'}
        </button>
        
        <button
          onClick={copyToken}
          disabled={!token || token.startsWith('❌')}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 mr-2"
        >
          📋 Copy Token
        </button>
      </div>

      {/* Token Display */}
      {token && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            JWT Token:
          </label>
          <textarea
            value={token}
            readOnly
            className="w-full h-32 p-3 border border-gray-300 rounded font-mono text-xs bg-gray-50"
            placeholder="Click 'Extract JWT Token' to get your authentication token..."
          />
        </div>
      )}

      {/* API Testing Buttons */}
      <div className="mb-4">
        <h4 className="text-md font-medium text-gray-800 mb-2">🧪 Test API Endpoints:</h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={testAPI}
            disabled={loading || !token || token.startsWith('❌')}
            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm"
          >
            Test /auth/me
          </button>
          
          <button
            onClick={() => testOtherEndpoints('/api/v1/wallets/balance')}
            disabled={loading || !token || token.startsWith('❌')}
            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm"
          >
            Test /wallets/balance
          </button>
          
          <button
            onClick={() => testOtherEndpoints('/api/v1/users/search?q=test')}
            disabled={loading || !token || token.startsWith('❌')}
            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm"
          >
            Test /users/search
          </button>
        </div>
      </div>

      {/* API Result Display */}
      {apiResult && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Test Result:
          </label>
          <pre className="w-full h-48 p-3 border border-gray-300 rounded font-mono text-xs bg-gray-50 overflow-auto">
            {apiResult}
          </pre>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">📋 How to Use:</h4>
        <ol className="text-sm text-blue-700 space-y-1">
          <li>1. Click "Extract JWT Token" to get your authentication token</li>
          <li>2. Copy the token and use it in curl commands:</li>
          <li className="font-mono text-xs bg-blue-100 p-2 rounded mt-2">
            curl -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/v1/auth/me
          </li>
          <li>3. Or test endpoints directly using the buttons above</li>
        </ol>
      </div>
    </div>
  );
}
