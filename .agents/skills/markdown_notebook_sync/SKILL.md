---
name: markdown_notebook_sync
description: Hardened Markdown-native synchronization protocol for the Notebook application.
---

# Markdown Notebook Sync

This skill enables the synchronization of custom content into the Notebook application using the **Markdown-Native Protocol**. It replaces legacy HTML/JSON-based sync systems with a robust, human-readable format.

## The Situation: Why Markdown?
Earlier versions of this system required complex, nested HTML (BlockNote serialization) or JSON-strings. This led to high parsing failure rates and low human readability in S3. 

**Now:**
- **Storage**: Plain UTF-8 Markdown (`.md`).
- **Metadata**: Lightweight DynamoDB pointers (id, title, snippet).
- **Rendering**: The web app uses a "Smart Loader" that rendering the Markdown into editable blocks on demand.
- **Conversion**: No complex conversion is required on the backend. Your scripts simply "speak" standard Markdown.

## Protocol Flow (Atomic Sync)
To create or update a page from a script:

1.  **Generate Markdown**: Construct a standard Markdown string.
2.  **Get Ticket**: `GET /notebooks/urls/upload?id={nbId}&pageId={pageId}` with `Authorization: {API_KEY}`.
3.  **PUT Content**: Upload the Markdown string to the provided S3 URL with `Content-Type: text/markdown`.
4.  **Commit Metadata**: `PATCH /notebooks/{id}` with the updated page list and snippet.

## Components & Resources
- **Scripts**: [sync_client.py](file:///Users/karankanchetty/workplace/M1000M/AWS/Notebook/.agents/skills/markdown_notebook_sync/scripts/sync_client.py)
- **Reference**: [markdown_sync_guide.md](file:///Users/karankanchetty/.gemini/antigravity/brain/d9cbf0a9-8076-4804-bfa4-816463dfab16/markdown_sync_guide.md)

## Usage Example
```python
from sync_client import NotebookClient

client = NotebookClient(api_key="your_key")
client.sync_page(
    notebook_id="your_nb_id",
    page_id="unique_id",
    title="Daily Briefing",
    markdown_content="# Intelligence Report\n\n- Signal 1\n- Signal 2"
)
```
