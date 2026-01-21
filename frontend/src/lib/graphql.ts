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
      tags
      pages {
        id
        title
        contentKey
      }
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
      tags
      pages {
        id
        title
        contentKey
      }
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
      tags
      pages {
        id
        title
        contentKey
      }
    }
  }
`;

export const updateNotebook = /* GraphQL */ `
  mutation UpdateNotebook($id: ID!, $title: String, $snippet: String, $isFavorite: Boolean, $contentKey: String, $tags: [String], $pages: [PageInput]) {
    updateNotebook(id: $id, title: $title, snippet: $snippet, isFavorite: $isFavorite, contentKey: $contentKey, tags: $tags, pages: $pages) {
      id
      title
      snippet
      isFavorite
      contentKey
      lastEditedAt
      tags
      pages {
        id
        title
        contentKey
      }
    }
  }
`;

export const deleteNotebook = /* GraphQL */ `
  mutation DeleteNotebook($id: ID!) {
    deleteNotebook(id: $id)
  }
`;

export const getUploadUrl = /* GraphQL */ `
  query GetUploadUrl($id: ID!, $pageId: String) {
    getUploadUrl(id: $id, pageId: $pageId)
  }
`;

export const getDownloadUrl = /* GraphQL */ `
  query GetDownloadUrl($id: ID!, $pageId: String) {
    getDownloadUrl(id: $id, pageId: $pageId)
  }
`;

export const getAssetUploadUrl = /* GraphQL */ `
  query GetAssetUploadUrl($filename: String!, $contentType: String!) {
    getAssetUploadUrl(filename: $filename, contentType: $contentType)
  }
`;
