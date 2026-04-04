import requests
import json
import os
from typing import List, Dict, Any, Optional

class NotebookClient:
    """
    A production-grade client for the Markdown-Native Notebook Sync Protocol.
    Supports atomic 'PUT then PATCH' workflow with API Key authentication.
    """
    
    BASE_URL = "https://80r4fpe4ac.execute-api.us-west-2.amazonaws.com/prod"
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("NOTEBOOK_API_KEY")
        if not self.api_key:
            raise ValueError("API Key is required. Set NOTEBOOK_API_KEY env var.")
        
        # We use 'Authorization' for both JWT (Web) and API Key (Scripts)
        self.headers = {
            "Authorization": self.api_key,
            "Content-Type": "application/json"
        }

    def sync_page(self, notebook_id: str, page_id: str, title: str, markdown_content: str):
        """
        Syncs a Markdown page to a notebook.
        1. Gets pre-signed URL.
        2. Uploads Markdown to S3.
        3. Registers metadata in DynamoDB.
        """
        # 1. Get Upload Ticket (Pre-signed URL)
        print(f"Requesting upload ticket for {page_id}...")
        url_resp = requests.get(
            f"{self.BASE_URL}/notebooks/urls/upload",
            headers=self.headers,
            params={"id": notebook_id, "pageId": page_id}
        )
        url_resp.raise_for_status()
        s3_url = url_resp.json()["url"]

        # 2. Upload Markdown to S3
        print(f"Uploading Markdown content to S3...")
        put_resp = requests.put(
            s3_url,
            data=markdown_content.encode('utf-8'),
            headers={"Content-Type": "text/markdown"}
        )
        put_resp.raise_for_status()

        # 3. Commit Metadata (PATCH)
        # Fetch current notebook to manage the page list
        print(f"Updating notebook metadata...")
        nb_resp = requests.get(f"{self.BASE_URL}/notebooks/{notebook_id}", headers=self.headers)
        nb_resp.raise_for_status()
        notebook = nb_resp.json()
        
        current_pages = notebook.get("pages", [])
        
        # Build the new/updated page entry
        new_page = {"id": page_id, "title": title, "order": len(current_pages)}
        
        # Deduplicate and Append
        updated_pages = [p for p in current_pages if p["id"] != page_id]
        updated_pages.append(new_page)

        patch_resp = requests.patch(
            f"{self.BASE_URL}/notebooks/{notebook_id}",
            headers=self.headers,
            json={
                "pages": updated_pages,
                "snippet": markdown_content[:150] # Update the sidebar preview
            }
        )
        patch_resp.raise_for_status()
        print(f"Sync complete: {title}")

if __name__ == "__main__":
    # Test script usage
    print("Notebook Client SDK initialized.")
