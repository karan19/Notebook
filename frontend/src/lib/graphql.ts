export const listNotebooks = /* GraphQL */ `
  query ListNotebooks {
    listNotebooks {
      id
      title
      snippet
      isFavorite
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
      isFavorite
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
      isFavorite
      contentKey
      createdAt
      lastEditedAt
    }
  }
`;

export const updateNotebook = /* GraphQL */ `
  mutation UpdateNotebook($id: ID!, $title: String, $snippet: String, $isFavorite: Boolean, $contentKey: String) {
    updateNotebook(id: $id, title: $title, snippet: $snippet, isFavorite: $isFavorite, contentKey: $contentKey) {
      id
      title
      snippet
      isFavorite
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
