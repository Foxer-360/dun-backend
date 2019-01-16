import request from 'request-promise';

const credentials = {
  client_id: process.env.AUTH0_CLIENTID,
  client_secret: process.env.AUTH0_CLIENTSECRET,
  audience: process.env.AUTH0_AUDIENCE_API,
  grant_type: 'client_credentials',
};

class Auth0Wrapper {
/**
 *
 * @param {*} accessToken
 */
  constructor(accessToken) {
    this.token = accessToken;
  }

  get isAuthenticated() { return !!this.token; }

  createOptions(body) {
    return {
      headers: { Authorization: `Bearer ${this.token}` },
      json: true,
      body,
    };
  }

  static authenticate() {
    return request.post({
      uri: `${process.env.AUTH0_API_URL}/oauth/token`,
      form: credentials,
      json: true,
    }).then(res => new Auth0Wrapper(res.access_token));
  }


  static generateRandomPassword() {
    return Math.random().toString(36).slice(-8);
  }

  getUsers() {
    return request.get(`${process.env.AUTH0_API_URL}/api/v2/users`, this.createOptions());
  }

  createUser(email, username, password) {
    return request.post(`${process.env.AUTH0_API_URL}/api/v2/users`, this.createOptions({
      email,
      username,
      password,
      connection: 'Username-Password-Authentication',
    }));
  }

  deleteUser(id) {
    return request.delete(`${process.env.AUTH0_API_URL}/api/v2/users/${id}`, this.createOptions());
  }

  updateUser(userData, id) {
    return request.patch(`${process.env.AUTH0_API_URL}/api/v2/users/${id}`, this.createOptions({
      ...userData,
      connection: 'Username-Password-Authentication',
    }));
  }
}

export default Auth0Wrapper;
