import sys
import argparse
from typing import List
from notebook_skill_client import NotebookSkillClient

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Error: Missing dependencies. Run: pip install requests beautifulsoup4")
    sys.exit(1)

class WebIngestSkill:
    """
    A Skill that transforms a URL into a BlockNote-compatible Notebook page.
    """
    
    def __init__(self, client: NotebookSkillClient):
        self.client = client

    def ingest_url(self, url: str, notebook_title: str = "Web Research Feed"):
        print(f"[*] Starting ingest for: {url}")
        
        # 1. Fetch and Parse
        response = requests.get(url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 2. Extract Title and Content
        page_title = soup.title.string if soup.title else url
        main_content = soup.find('main') or soup.find('article') or soup.body
        
        if not main_content:
            print("[!] Could not find main content. Falling back to entire body.")
            main_content = soup.body

        # 3. Transform to BlockNote Blocks
        blocks = []
        
        # Add a title block (H1)
        blocks.append(self.client.create_block("heading", page_title, {"level": 1}))
        
        # Add a source link
        blocks.append(self.client.create_block("paragraph", f"Source: {url}"))

        # Process common tags with deduplication and noise filtering
        seen_headers = {page_title.lower()}
        
        # Heuristic for "Main" content tags - skip common noise containers
        noise_keywords = {'nav', 'footer', 'sidebar', 'share', 'comment', 'social', 'advertising'}
        
        for element in main_content.find_all(['h1', 'h2', 'h3', 'p', 'li']):
            # Noise check: if the element or its parents have "noise" classes/ids
            parent_info = str(element.parent.get('class', [])) + str(element.parent.get('id', ''))
            if any(k in parent_info.lower() for k in noise_keywords):
                continue

            text = element.get_text(strip=True)
            if not text or len(text) < 2: continue
            
            # Deduplicate titles that match the page title or previously seen headers
            if element.name in ['h1', 'h2', 'h3']:
                if text.lower() in seen_headers:
                    continue
                seen_headers.add(text.lower())
                
                level = int(element.name[1])
                blocks.append(self.client.create_block("heading", text, {"level": level}))
            elif element.name == 'p':
                blocks.append(self.client.create_block("paragraph", text))
            elif element.name == 'li':
                blocks.append(self.client.create_block("bulletListItem", text))

        # Join blocks into a single HTML string
        html_content = "".join(blocks)
        
        # 4. Sync to Notebook
        # Find or Create Notebook
        notebooks = self.client.list_notebooks()
        target_nb = next((nb for nb in notebooks if nb['title'] == notebook_title), None)
        
        if not target_nb:
            print(f"[*] Creating new notebook: {notebook_title}")
            target_nb = self.client.create_notebook(notebook_title)
        
        nb_id = target_nb['id']
        print(f"[*] Syncing to Notebook ID: {nb_id}")
        
        result = self.client.sync_page(nb_id, page_title, html_content)
        print(f"[+] Success! Page synced: {page_title}")
        return result

def main():
    parser = argparse.ArgumentParser(description="Ingest a URL into your Notebook.")
    parser.add_argument("--url", required=True, help="The URL to ingest.")
    parser.add_argument("--title", default="Web Research Feed", help="Target notebook title.")
    parser.add_argument("--key", help="API Key (overrides env var).")
    
    args = parser.parse_args()
    
    try:
        client = NotebookSkillClient(api_key=args.key)
        skill = WebIngestSkill(client)
        skill.ingest_url(args.url, args.title)
    except Exception as e:
        print(f"[!] Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
