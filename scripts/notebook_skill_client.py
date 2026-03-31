import requests
import json
import uuid
import time
import os
import html
from typing import List, Dict, Any, Optional

class NotebookSkillClient:
    """
    A production-grade client for the Notebook Skill System.
    Implements the 'OpenClaw Protocol':
    1. Get Upload URL
    2. PUT HTML to S3
    3. PATCH Metadata in DynamoDB
    """
    
    BASE_URL = "https://80r4fpe4ac.execute-api.us-west-2.amazonaws.com/prod"
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("NOTEBOOK_API_KEY")
        if not self.api_key:
            raise ValueError("API Key is required. Set NOTEBOOK_API_KEY env var or pass it to constructor.")
        
        self.headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json"
        }

    def list_notebooks(self) -> List[Dict[str, Any]]:
        """List all notebooks for the user."""
        response = requests.get(f"{self.BASE_URL}/notebooks", headers=self.headers)
        response.raise_for_status()
        return response.json()

    def create_notebook(self, title: str) -> Dict[str, Any]:
        """Create a new notebook."""
        response = requests.post(
            f"{self.BASE_URL}/notebooks", 
            headers=self.headers,
            json={"title": title}
        )
        response.raise_for_status()
        return response.json()

    def sync_page(self, notebook_id: str, page_title: str, html_content: str, page_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Syncs a single page to a notebook.
        Follows the atomic 'PUT then PATCH' protocol.
        """
        if not page_id:
            page_id = str(uuid.uuid4())
            
        # 1. Get the Upload Ticket (Pre-signed S3 URL)
        upload_url_response = requests.get(
            f"{self.BASE_URL}/notebooks/urls/upload",
            headers=self.headers,
            params={"id": notebook_id, "pageId": page_id}
        )
        upload_url_response.raise_for_status()
        upload_ticket = upload_url_response.json()
        s3_url = upload_ticket["url"]
        
        # 2. PUT the HTML Content to S3
        # Wrap content in bn-root if not already
        if "bn-root" not in html_content:
            html_content = self.wrap_in_bn_root(html_content)
            
        put_response = requests.put(
            s3_url,
            data=html_content.encode('utf-8'),
            headers={"Content-Type": "text/html"}
        )
        put_response.raise_for_status()
        
        # 3. Register Metadata (PATCH)
        # First, get current notebook state to avoid overwriting other pages
        nb_state = self.get_notebook(notebook_id)
        current_pages = nb_state.get("pages", [])
        
        # Update or Add the page ref
        new_page_ref = {"id": page_id, "title": page_title, "order": len(current_pages)}
        
        # Avoid duplicates
        updated_pages = [p for p in current_pages if p["id"] != page_id]
        updated_pages.append(new_page_ref)
        
        patch_response = requests.patch(
            f"{self.BASE_URL}/notebooks/{notebook_id}",
            headers=self.headers,
            json={"pages": updated_pages}
        )
        patch_response.raise_for_status()
        return patch_response.json()

    def get_notebook(self, notebook_id: str) -> Dict[str, Any]:
        """Fetch full notebook metadata."""
        response = requests.get(f"{self.BASE_URL}/notebooks/{notebook_id}", headers=self.headers)
        response.raise_for_status()
        return response.json()

    def delete_notebook(self, notebook_id: str) -> bool:
        """Hard delete a notebook and all its pages (S3 + DynamoDB)."""
        response = requests.delete(f"{self.BASE_URL}/notebooks/{notebook_id}", headers=self.headers)
        response.raise_for_status()
        return True

    def delete_page(self, notebook_id: str, page_id: str) -> bool:
        """Delete a single page from a notebook (S3 + Metadata update)."""
        response = requests.delete(
            f"{self.BASE_URL}/notebooks/{notebook_id}/pages/{page_id}", 
            headers=self.headers
        )
        response.raise_for_status()
        return True

    @staticmethod
    def wrap_in_bn_root(inner_html: str) -> str:
        """Helper to ensure BlockNote compatibility."""
        return f'<div class="bn-root"><div class="bn-block-group">{inner_html}</div></div>'

    @staticmethod
    def create_block(content_type: str, text: str, props: Dict[str, Any] = {}) -> str:
        """Helper to generate a BlockNote HTML block with escaped content."""
        props_json = json.dumps(props, separators=(',', ':'))
        escaped_text = html.escape(text)
        return (
            f'<div class="bn-block" data-content-type="{content_type}" data-props=\'{props_json}\'>'
            f'<div class="bn-block-content"><p class="bn-inline-content">{escaped_text}</p></div>'
            f'</div>'
        )

# Example Usage Template
if __name__ == "__main__":
    # Internal test only
    print("Notebook Skill SDK Loaded.")
