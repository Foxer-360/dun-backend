export default async function (ctx, idToken) {
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
