const jwt = require('express-jwt')
const jwksRsa = require('jwks-rsa')
// Authentication middleware. When used, the
// if the access token exists, it be verified against
// the Auth0 JSON Web Key Set
const checkJwt = jwt({
  // Dynamically provide a signing key
  // based on the kid in the header and
  // the signing keys provided by the JWKS endpoint.
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 1,
    jwksUri: `https://wyr.eu.auth0.com/.well-known/jwks.json`,
    secret: `2O5ou72z0LQFzfmuc-NTrM5Lq8h85wZzwTYR8azXaId-UB8DW24VsDtVdsMCX4U7`
  }),

  // Validate the audience and the issuer.
  credentialsRequired: false,
  audience: `https://wyr.eu.auth0.com/api/v2/`,
  issuer: `https://wyr.eu.auth0.com`,
  algorithms: [`RS256`]
})

module.exports = { checkJwt }