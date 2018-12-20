import { GraphQLServer } from 'graphql-yoga';
import {} from 'dotenv/config';
import { Prisma, forwardTo } from 'prisma-binding';
import { express as voyagerMiddleware } from 'graphql-voyager/middleware';
import bodyParser from 'body-parser';
import validateAndParseIdToken from './helpers/validateAndParseIdToken';
import { checkJwt, storeUserToRequest } from './middleware';

async function createPrismaUser(ctx, idToken) {
  const user = await ctx.db.mutation.createUser({
    data: {
      identity: idToken.sub.split('|')[0],
      auth0id: idToken.sub.split('|')[1],
      name: idToken.name,
      email: idToken.email,
      avatar: idToken.picture,
    },
  });
  return user;
}

const resolvers = {
  Query: {
    users: forwardTo('db'),
    privileges: forwardTo('db'),
    hasUserPermission: async (parent, { idToken, gqlOperation }, context, info) => {
      let userToken = null;
      try {
        userToken = await validateAndParseIdToken(idToken);
      } catch (err) {
        throw new Error(err.message);
      }
      const auth0id = userToken.sub.split('|')[1];
      let user = await context.db.query.user({ where: { auth0id } },`{
        id
        name
        privileges {
          id
          name
          actionTypes
        }
        actionTypes
        avatar
      }`);
      if (!user) {
        user = createPrismaUser(context, userToken);
      }

      // Checking based on request token, if is action permitted to user
      if (
        !gqlOperation.selectionSet.selections
          .some(selection => !user.actionTypes
            .includes(selection.name.value))) {
        return true;
      }

      // Checking based on request token, if is action permitted to some privilege of user
      if (
        !gqlOperation.selectionSet.selections
          .some(selection => !user.privileges.some(privilege => privilege.actionTypes
            .includes(selection.name.value)))) {
        return true;
      }

      return false;
    },
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
    createUser: forwardTo('db'),
    updateUser: forwardTo('db'),
  },
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
    db,
  }),
  middlewares: [
  ],
});

server.express.use(bodyParser.json());
server.express.use('/voyager', voyagerMiddleware({ endpointUrl: 'http://localhost:4466' }));
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
server.start(() => console.log('GraphQL server is running on http://localhost:4000'));
