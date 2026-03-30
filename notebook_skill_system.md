# OpenClaw Skills: Notebook Intelligence System (Refined)

The **Notebook Skill System** is a high-fidelity, atomic documentation framework. In an **OpenClaw** context, it enables an AI agent to read from and write to the persistent "Energy Signature" of a project using structured, block-based HTML.

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

### 3. Sync a New Page (The "Lore" Flow)
**Step 1: Get the Upload Ticket**
```bash
curl -H "x-api-key: <KEY>" \
     "https://80r4fpe4ac.execute-api.us-west-2.amazonaws.com/prod/notebooks/urls/upload?id=<NB_ID>&pageId=<PAGE_UUID>"
```

**Step 2: PUT the HTML Content**
*Construct the HTML using the `bn-root` schema mentioned above.*
```bash
curl -X PUT -H "Content-Type: text/html" \
     --data-binary "@LoreContent.html" \
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

## 🛡️ Content Fidelity: The "BlockNote" Standard
The Notebook frontend utilizes the **BlockNote** engine. To ensure the web UI does not break, any agent writing to the system **MUST** follow the **Full-HTML Serialization** standard.

> [!IMPORTANT]
> **NO RAW MARKDOWN**: Do not upload `.md` files or plain text. The system requires structured HTML blocks. If the agent sends raw text, the editor will fail to parse it into blocks, resulting in a blank or corrupted UI.

### Valid Block Schema (HTML Example)
When writing a page via `lore_exporter.py` or `S3 PUT`, the content must be wrapped in a `bn-root` structure as follows:

```html
<div class="bn-root">
  <div class="bn-block-group">
    <!-- Heading 1 (Auto-Titling Trigger) -->
    <div class="bn-block" data-content-type="heading" data-props='{"level":1}'>
      <div class="bn-block-content"><p>Architectural Strategy</p></div>
    </div>

    <!-- Standard Paragraph -->
    <div class="bn-block" data-content-type="paragraph" data-props='{}'>
      <div class="bn-block-content"><p>This strategy defines the <strong>core primitives</strong> of the system.</p></div>
    </div>

    <!-- Bullet Item -->
    <div class="bn-block" data-content-type="bulletListItem" data-props='{}'>
      <div class="bn-block-content"><p>High fidelity rendering</p></div>
    </div>
  </div>
</div>
```

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
3.  **S3 UPLOAD**: Perform a `PUT` to the returned URL with `Content-Type: text/html` using the **BlockNote HTML** format described above.
4.  **METADATA REGISTRATION**: Patch the `pages` array in the notebook object. If the first block is an `<h1>`, the web app will automatically extract it as the title.
