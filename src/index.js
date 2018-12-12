import { GraphQLServer } from 'graphql-yoga';
import dotenv from 'dotenv'
dotenv.config()

const validateAndParseIdToken = require('./helpers/validateAndParseIdToken');
const { Prisma, forwardTo } = require('prisma-binding');
const { express: voyagerMiddleware } = require('graphql-voyager/middleware');
const bodyParser = require('body-parser');
const gql = require('graphql-tag');
const path = require('path');
const { checkJwt, getUser } = require("./middleware");

async function createPrismaUser(ctx, idToken) {
  const user = await ctx.db.mutation.createUser({
    data: {
      identity: idToken.sub.split(`|`)[0],
      auth0id: idToken.sub.split(`|`)[1],
      name: idToken.name,
      email: idToken.email,
      avatar: idToken.picture
    }
  })
  return user
}

const resolvers = {
  Query: {
    users: forwardTo('db'),
    privileges: forwardTo('db'),
  },
  Mutation: {
    async authenticate(parent, { idToken }, ctx, info) {
      let userToken = null
      try {
        userToken = await validateAndParseIdToken(idToken)
      } catch (err) {
        throw new Error(err.message)
      }
      const auth0id = userToken.sub.split("|")[1]
      let user = await ctx.db.query.user({ where: { auth0id } }, info)
      if (!user) {
        user = createPrismaUser(ctx, userToken)
      }
      return user
    },
    createPrivilege: forwardTo('db'),
    updatePrivilege: forwardTo('db'),
    createUser: forwardTo('db'),
    updateUser: forwardTo('db'),
  }
};

const db = new Prisma({
  typeDefs: 'src/generated/prisma.graphql',
  endpoint: 'http://localhost:4466',
});

const server = new GraphQLServer({
  typeDefs: 'src/schema.graphql',
  resolvers,
  context: req => ({
    ...req,
    db
  })
});

server.express.use(bodyParser.json());
server.express.use('/voyager', voyagerMiddleware({ endpointUrl: 'http://localhost:4466' }));
server.express.post(
  server.options.endpoint,
  checkJwt,
  (err, req, res, next) => {
    if (err) return res.status(401).send(err.message)
    next()
  }
)
server.express.post(server.options.endpoint, (req, res, next) =>
  getUser(req, res, next, db)
)
server.start(() => console.log(`GraphQL server is running on http://localhost:4000`));