const { GraphQLServer } = require('graphql-yoga');
const { Prisma } = require('prisma-binding');
const { express: voyagerMiddleware } = require('graphql-voyager/middleware');
const bodyParser = require('body-parser');
const gql = require('graphql-tag');
const { checkJwt } = require("./middleware/jwt")

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
    user: (_, args, context, info) => {
      return context.prisma.query.user(
        {
          where: {
            id: args.id,
          },
        },
        info,
      )
    },
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
  }
};

const server = new GraphQLServer({
  typeDefs: 'src/schema.graphql',
  resolvers,
  context: req => ({
    ...req,
    prisma: new Prisma({
      typeDefs: 'src/generated/prisma.graphql',
      endpoint: 'http://localhost:4466',
    }),
  }),
});
/*
const isOrdersQueryAsked = query => gql`${query}`
  .definitions
    .some(definition =>
      definition.selectionSet.selections
        .some(selection => console.log(selection.name)));

server.express.use(bodyParser.json());
server.express.post(
  server.options.endpoint,
  (req, res, next) => {
    if (isOrdersQueryAsked(req.body.query)) {
      return checJwt(req, res, next);
    }
    return next();
  },
  (err, req, res, next) => {
    if (err) return res.status(401).send(err.message);
    next();
  }
);*/
/*
const authMiddleware = (req, res, next) => {
  console.log('inside middleware')

  const askedFields = gql`${req.body.query}`
  .definitions
    .map(definition =>
      definition.selectionSet.selections
        .map(selection => selection));

  console.log(askedFields);

  next();
}
*/
server.express.use(bodyParser.json());
/*server.express.use(authMiddleware);*/
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