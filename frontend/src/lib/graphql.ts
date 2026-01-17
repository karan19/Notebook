export const listNotebooks = /* GraphQL */ `
  query ListNotebooks {
    listNotebooks {
      id
      title
      snippet
      contentKey
      lastEditedAt
      createdAt
    }
  }
`;

export const getNotebook = /* GraphQL */ `
  query GetNotebook($id: ID!) {
    getNotebook(id: $id) {
      id
      title
      snippet
      contentKey
      lastEditedAt
      createdAt
    }
  }
`;

export const createNotebook = /* GraphQL */ `
  mutation CreateNotebook($title: String!) {
    createNotebook(title: $title) {
      id
      title
      contentKey
      createdAt
      lastEditedAt
    }
  }
`;

export const updateNotebook = /* GraphQL */ `
  mutation UpdateNotebook($id: ID!, $title: String, $snippet: String, $contentKey: String) {
    updateNotebook(id: $id, title: $title, snippet: $snippet, contentKey: $contentKey) {
      id
      title
      snippet
      contentKey
      lastEditedAt
    }
  }
`;

export const deleteNotebook = /* GraphQL */ `
  mutation DeleteNotebook($id: ID!) {
    deleteNotebook(id: $id)
  }
`;

export const getUploadUrl = /* GraphQL */ `
  query GetUploadUrl($id: ID!) {
    getUploadUrl(id: $id)
  }
`;

export const getDownloadUrl = /* GraphQL */ `
  query GetDownloadUrl($id: ID!) {
    getDownloadUrl(id: $id)
  }
`;
