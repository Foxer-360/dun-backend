import { request } from 'graphql-request';

export default async function () {
  const {
    __schema: {
      queryType: {
        fields: externalQueriesTypes,
      },
      mutationType: {
        fields: externalMutationTypes,
      },
    },
  } = await request(
    process.env.AUTHORIZED_API_URL,
    `{
      __schema {
        queryType {
          name
          fields {
            name
          }
        }
        mutationType {
          name
          fields {
            name
          }
        }
      }
    }`,
  );

  const {
    __schema: {
      queryType: {
        fields: localQueriesTypes,
      },
      mutationType: {
        fields: localMutationTypes,
      },
    },
  } = await request(
    `http://localhost:${process.env.PORT}`,
    `{
      __schema {
        queryType {
          name
          fields {
            name
          }
        }
        mutationType {
          name
          fields {
            name
          }
        }
      }
    }`,
  );

  return {
    externalApiTypes: [
      ...externalQueriesTypes.map(({ name }) => name),
      ...externalMutationTypes.map(({ name }) => name),
    ],
    authorizationApiTypes: [
      ...localQueriesTypes.map(({ name }) => name),
      ...localMutationTypes.map(({ name }) => name),
    ],
  };
}
