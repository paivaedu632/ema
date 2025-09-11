/**
 * JWT Token Generator for Testing
 * Generates valid Supabase-compatible JWT tokens using ES256 algorithm
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Use the actual Supabase project's key ID but with our generated private key
// This is a workaround - in production, you'd need the actual private key from Supabase
const PRIVATE_KEY = {
  "kty": "EC",
  "kid": "a6e6bb46-bc5e-4129-b026-32e5a17af311", // Use the actual Supabase key ID
  "use": "sig",
  "key_ops": ["sign", "verify"],
  "alg": "ES256",
  "ext": true,
  "d": "vNrkjhxNDo5yiBTPrCqoc0J-LxnFHTyDtmV7oYfTPm0",
  "crv": "P-256",
  "x": "81YNl9WJwMpFSJoIUafXCfbIk0_5b_VaBQ_ogZvUGCc",
  "y": "JUvuBWDqoTOBS4u19XOQZYTICWk0pp7Ab8-Uv5AnzCI"
};

// Convert JWK to PEM format for ES256
function jwkToPem(jwk) {
  // For ES256, we need to convert the JWK to PEM format
  // This is a simplified conversion - in production, use a proper library
  const x = Buffer.from(jwk.x, 'base64url');
  const y = Buffer.from(jwk.y, 'base64url');
  const d = Buffer.from(jwk.d, 'base64url');
  
  // Create EC private key in PEM format
  // This is a basic implementation - for production use jose or node-jose library
  const keyObject = crypto.createPrivateKey({
    key: {
      kty: jwk.kty,
      crv: jwk.crv,
      x: jwk.x,
      y: jwk.y,
      d: jwk.d
    },
    format: 'jwk'
  });
  
  return keyObject.export({ format: 'pem', type: 'pkcs8' });
}

// Generate JWT token
function generateJWT(userId = '1d7e1eb7-8758-4a67-84a8-4fe911a733bc', options = {}) {
  const {
    email = 'paivaedu.br@gmail.com',
    role = 'authenticated',
    aud = 'authenticated',
    exp = Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
    iat = Math.floor(Date.now() / 1000),
    iss = 'https://kjqcfedvilcnwzfjlqtq.supabase.co/auth/v1',
    sub = userId
  } = options;

  const payload = {
    aud,
    exp,
    iat,
    iss,
    sub,
    email,
    phone: '',
    app_metadata: {
      provider: 'email',
      providers: ['email']
    },
    user_metadata: {
      email,
      email_verified: true,
      phone_verified: false,
      sub: userId
    },
    role,
    aal: 'aal1',
    amr: [{ method: 'password', timestamp: iat }],
    session_id: crypto.randomUUID()
  };

  const privateKey = jwkToPem(PRIVATE_KEY);
  
  return jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    keyid: PRIVATE_KEY.kid,
    header: {
      alg: 'ES256',
      kid: PRIVATE_KEY.kid,
      typ: 'JWT'
    }
  });
}

// Export for use in tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateJWT };
}

// CLI usage
if (require.main === module) {
  const userId = process.argv[2] || '1d7e1eb7-8758-4a67-84a8-4fe911a733bc';
  const token = generateJWT(userId);
  console.log('Generated JWT Token:');
  console.log(token);
  console.log('\nToken payload:');
  console.log(JSON.stringify(jwt.decode(token), null, 2));
}
