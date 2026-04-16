# OpenClaw Skills: Notebook Intelligence System (Refined)

The **Notebook Skill System** is a high-fidelity, atomic documentation framework. In an **OpenClaw** context, it enables an AI agent to read from and write to the persistent "Energy Signature" of a project using structured, block-based Markdown.

---

## 🌐 Production Infrastructure
- **Base URL**: `https://80r4fpe4ac.execute-api.us-west-2.amazonaws.com/prod`
- **Region**: `us-west-2`

---

## 🔑 Authentication (Agent Protocol)
The OpenClaw system interfaces with the backend strictly via the **API Key** path. 

- **Header**: `x-api-key: <PROJECT_API_KEY>`
- **Validation**: The backend extracts the `userId` from the key association to ensure isolated data access.

---

## ⚡ Quick Start: `curl` Playground
Use these verbatim templates for the **OpenClaw** integration. Replace `<KEY>` with your production API key.

### 1. List All Workspaces
Find the `id` of the notebook you want to sync to.
```bash
curl -H "x-api-key: <KEY>" \
     "https://80r4fpe4ac.execute-api.us-west-2.amazonaws.com/prod/notebooks"
```

### 2. Create a New Notebook
```bash
curl -X POST -H "x-api-key: <KEY>" -H "Content-Type: application/json" \
     -d '{"title": "OpenClaw Intelligence Feed"}' \
     "https://80r4fpe4ac.execute-api.us-west-2.amazonaws.com/prod/notebooks"
```

curl -H "x-api-key: <KEY>" \
     "https://80r4fpe4ac.execute-api.us-west-2.amazonaws.com/prod/notebooks/urls/upload?id=<NB_ID>&pageId=<PAGE_UUID>"
```

**Step 2: PUT the Markdown Content**
*Construct the content using standard Markdown or the Lossy Markdown block conversion.*
```bash
curl -X PUT -H "Content-Type: text/markdown" \
     --data-binary "@LoreContent.md" \
     "<PRESIGNED_S3_URL_FROM_STEP_1>"
```

**Step 3: Register Metadata**
*Update the existing notebook object's `pages` array.*
```bash
curl -X PATCH -H "x-api-key: <KEY>" -H "Content-Type: application/json" \
     -d '{"pages": [{"id": "<PAGE_UUID>", "title": "Protocol Insight", "order": 0}]}' \
     "https://80r4fpe4ac.execute-api.us-west-2.amazonaws.com/prod/notebooks/<NB_ID>"
```

### 4. Hard Delete a Page
```bash
curl -X DELETE -H "x-api-key: <KEY>" \
     "https://80r4fpe4ac.execute-api.us-west-2.amazonaws.com/prod/notebooks/<NB_ID>/pages/<PAGE_ID>"
```

---

## 🛡️ Content Fidelity: The Markdown Standard
The Notebook frontend utilizes the **BlockNote** engine. To ensure high portability and machine readability, any agent writing to the system **SHOULD** follow standard Markdown conventions.

> [!NOTE]
> **Markdown Focus**: The system now strictly stores content as `.md` files in S3. While the web editor provides a rich UI, the underlying data is accessible and portable as plain text.

### Valid Content Example (Markdown)
When writing a page via `scripts/export-via-api.ts` or `S3 PUT`, the content should follow standard Markdown:

# My Architectural Strategy

This strategy defines the **core primitives** of the system.

- High fidelity rendering
- Portable Markdown

---

## 📚 Feature & GUID Mappings
### 1. Notebook Workspace (`/notebooks`)
*The primary container for multi-page documentation.*
- **GUID**: `f2d3c4b5-a6e7-4b8c-9a0d-1e2f3a4b5c6d`
- **Methods**: `GET` (List), `POST` (Create)

### 2. Page Content Operations (`/notebooks/{id}/pages`)
*Atomic management of individual pages and their hard deletion.*
- **GUID**: `e1d2c3b4-a5f6-4b7c-8d9e-0f1a2b3c4d5e`
- **Methods**: `DELETE /{pageId}` (Hard Delete)

---

## 🔄 OpenClaw Workflow: "PUT then PATCH"
To maintain consistency between the agent and the human user:

1.  **Resolve ID**: Call `GET [GUID_1]` to find the target notebook.
2.  **Fetch Upload URL**: Call `GET https://[BASE]/notebooks/urls/upload?id={nbId}&pageId={pageId}`.
3.  **S3 UPLOAD**: Perform a `PUT` to the returned URL with `Content-Type: text/markdown` using standard Markdown.
4.  **METADATA REGISTRATION**: Patch the `pages` array in the notebook object. If the first block is an `<h1>`, the web app will automatically extract it as the title.
