
const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');

const jwks = jwksClient({
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 1,
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
});

const validateAndParseIdToken = idToken => new Promise((resolve, reject) => {
  const { header, payload } = jwt.decode(idToken, { complete: true });

  if (!header || !header.kid || !payload) return reject(new Error('Invalid Token'));
  return jwks.getSigningKey(header.kid, (getSigningKeyError, key) => {
    if (getSigningKeyError) reject(new Error(`Error getting signing key: ${getSigningKeyError.message}`));
    jwt.verify(idToken, key.publicKey, { algorithms: ['RS256'] }, (jwtVerifyError, decoded) => {
      if (jwtVerifyError) return reject(new Error(`jwt verify error: ${jwtVerifyError.message}`));
      return resolve(decoded);
    });
  });
});

module.exports = validateAndParseIdToken;
