import { GraphQLServer } from 'graphql-yoga';
import {} from 'dotenv/config';
import { Prisma, forwardTo } from 'prisma-binding';
import { express as voyagerMiddleware } from 'graphql-voyager/middleware';
import bodyParser from 'body-parser';

import {
  checkJwt,
  storeUserToRequest,
} from './middleware';

import {
  hasUserPermission,
  actionTypes,
} from './resolvers';

import {
  createUser,
  deleteUser,
  getUsers,
} from './resolvers/user';

import {
  validateAndParseIdToken,
  createPrismaUser,
} from './helpers';

const resolvers = {
  Query: {
    users: getUsers,
    privileges: forwardTo('db'),
    hasUserPermission,
    actionTypes,
  },
  Mutation: {
    async authenticate(parent, { idToken }, context, info) {
      let userToken = null;
      try {
        userToken = await validateAndParseIdToken(idToken);
      } catch (err) {
        throw new Error(err.message);
      }
      const auth0id = userToken.sub.split('|')[1];
      let user = await context.db.query.user({ where: { auth0id } }, info);
      if (!user) {
        user = createPrismaUser(context, userToken);
      }
      return user;
    },
    createPrivilege: forwardTo('db'),
    updatePrivilege: forwardTo('db'),
    deletePrivilege: forwardTo('db'),
    createUser,
    updateUser: forwardTo('db'),
    deleteUser,
  },
};

const db = new Prisma({
  typeDefs: 'src/generated/prisma.graphql',
  endpoint: process.env.PRISMA_ENDPOINT,
});

const server = new GraphQLServer({
  typeDefs: 'src/schema.graphql',
  resolvers,
  context: req => ({
    ...req,
    db,
  }),
  middlewares: [
    async (resolve, root, args, context, info) => {
      const { operation: gqlOperation } = info;
      const authorizationToken = (
        context
        && context.headers
        && context.headers.authorization
      ) || (
        context
        && context.request
        && context.request.headers
        && context.request.headers.authorization
      );
 
      const token = authorizationToken && authorizationToken.includes('Bearer ')
        ? authorizationToken.replace('Bearer ', '')
        : authorizationToken;

      const hasPermission = await hasUserPermission(
        null,
        {
          ...(token ? { token } : { isUserAnonymous: true }),
          gqlOperation,
        },
        context,
      );
      if (hasPermission) {
        return resolve(root, args, context, info);
      }
      throw new Error(`User hasn't permission for ${gqlOperation.selectionSet.selections.map(selection => selection.name.value)}`);
    },
  ],
});

server.express.use(bodyParser.json());
server.express.use('/voyager', voyagerMiddleware({ endpointUrl: process.env.PRISMA_ENDPOINT }));
server.express.post(
  server.options.endpoint,
  checkJwt,
  (err, req, res, next) => {
    if (err) return res.status(401).send(err.message);
    return next();
  },
);

server.express.post(
  server.options.endpoint,
  (req, res, next) => storeUserToRequest(req, res, next, db),
);

// eslint-disable-next-line no-console
server.start(() => console.log(`GraphQL server is running on http://localhost:${process.env.PORT}`));
