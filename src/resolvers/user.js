import Auth0Wrapper from '../libs/Auth0Wrapper';

const createPrismaUserFromAuth0 = async (context, auth0User, actionTypes, privileges) => {
  return context.db.mutation.createUser({
    data: {
      identity: auth0User.identities[0].provider,
      auth0id: auth0User.user_id.split('|')[1],
      username: auth0User.email,
      email: auth0User.email,
      avatar: auth0User.picture,
      actionTypes,
      privileges,
    },
  }, `
  {
    id
    username
    email
    privileges {
      id
      name
    }
    actionTypes
    avatar
    identity
    auth0id
  }
  `);
};

const createUser = async (
  parent,
  {
    data: {
      email,
      username,
      password,
      actionTypes,
      privileges,
    },
  },
  context,
  info,
) => {
  const auth0Wrapper = await Auth0Wrapper.authenticate();
  try {
    const auth0User = await auth0Wrapper.createUser(email, username, password);

    const user = createPrismaUserFromAuth0(context, auth0User, actionTypes, privileges);
    return user;
  } catch (e) {
    throw e;
  }
};

const deleteUser = async (parent, { id }, context, info) => {
  const auth0Wrapper = await Auth0Wrapper.authenticate();
  const user = await context.db.mutation.deleteUser({ where: { id } });
  await auth0Wrapper.deleteUser(`auth0|${user.auth0id}`);
  return { ...user };
};


const getUsers = async (
  parent,
  args,
  context,
  info,
) => {
  const auth0Wrapper = await Auth0Wrapper.authenticate();
  const auth0Users = await auth0Wrapper.getUsers();
  const users = await context.db.query.users(null, `
  {
    id
    username
    email
    privileges {
      id
      name
    }
    actionTypes
    avatar
    identity
    auth0id
  }
  `);

  const syncedUsers = await Promise.all(auth0Users.filter(auth0User => !users.some(user => auth0User.user_id.split('|')[1] === user.auth0id)).map(async (auth0User) => {
    return createPrismaUserFromAuth0(context, auth0User, { set: [] }, []);
  }));

  return [...users, ...syncedUsers];
};

export {
  createUser,
  deleteUser,
  getUsers,
};
