import {
  validateAndParseIdToken,
  createPrismaUser,
} from '../helpers';

export default async (parent, { idToken, isUserAnonymous, gqlOperation }, context) => {
  let userToken = null;
  let user = null;
  const userQuery = `{
    id
    name
    privileges {
      id
      name
      actionTypes
    }
    actionTypes
    avatar
  }`;

  if (isUserAnonymous) {
    user = await context.db.query.user({ where: { auth0id: 'ANONYMOUS' } }, userQuery);
  } else {
    try {
      userToken = await validateAndParseIdToken(idToken);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err.message);
      throw new Error('Invalid id token.');
    }
    const { 1: auth0id } = userToken.sub.split('|');

    user = await context.db.query.user({ where: { auth0id } }, userQuery);
    if (!user) {
      user = createPrismaUser(context, userToken);
    }
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
};
