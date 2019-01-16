import {
  validateAndParseIdToken,
} from '../helpers';

export default async (parent, { token, isUserAnonymous, gqlOperation }, context) => {
  let userToken = null;
  let user = null;
  const userQuery = `{
    id
    username
    privileges {
      id
      name
      actionTypes
    }
    actionTypes
    avatar
  }`;
  const permittedSelections = ['__schema'];
  if (isUserAnonymous) {
    user = await context.db.query.user({ where: { auth0id: 'ANONYMOUS' } }, userQuery);
  } else {
    try {
      userToken = await validateAndParseIdToken(token);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err.message);
      throw new Error('Invalid id token.');
    }
    const { 1: auth0id } = userToken.sub.split('|');

    user = await context.db.query.user({ where: { auth0id } }, userQuery);
  }

  if (gqlOperation.selectionSet.selections.length === 1
    && gqlOperation.selectionSet.selections
      .some(selection => permittedSelections.includes(selection.name.value))
  ) {
    return true;
  }
  if (user
    && !gqlOperation.selectionSet.selections
      .some(selection => !user.actionTypes
        .includes(selection.name.value))
  ) {
    return true;
  }

  // Checking based on request token, if is action permitted to some privilege of user
  if (user
    && !gqlOperation.selectionSet.selections
      .some(selection => !(user.privileges.some(privilege => privilege.actionTypes
        .includes(selection.name.value) || permittedSelections.includes(selection.name.value))))) {
    return true;
  }

  return false;
};
