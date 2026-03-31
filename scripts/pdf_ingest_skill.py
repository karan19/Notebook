import sys
import os
import argparse
import uuid
from typing import List, Optional, Any
from notebook_skill_client import NotebookSkillClient

try:
    from pypdf import PdfReader
except ImportError:
    print("Error: Missing dependency. Run: pip install pypdf")
    sys.exit(1)

class PDFIngestSkill:
    """
    A Skill that transforms a PDF document into a high-fidelity Notebook.
    Each PDF page becomes a specific Notebook page.
    """
    
    def __init__(self, client: NotebookSkillClient):
        self.client = client

    def ingest_pdf(self, pdf_path: str, notebook_title: Optional[str] = None):
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF not found at: {pdf_path}")
            
        print(f"[*] Starting ingest for: {pdf_path}")
        reader = PdfReader(pdf_path)
        num_pages = len(reader.pages)
        print(f"[*] Found {num_pages} pages.")
        
        if not notebook_title:
            notebook_title = os.path.basename(pdf_path).replace(".pdf", "")

        # 1. Find or Create Notebook
        notebooks = self.client.list_notebooks()
        target_nb = next((nb for nb in notebooks if nb['title'] == notebook_title), None)
        
        if not target_nb:
            print(f"[*] Creating new notebook: {notebook_title}")
            target_nb = self.client.create_notebook(notebook_title)
        
        nb_id = target_nb['id']
        print(f"[*] Syncing to Notebook ID: {nb_id}")

        # 2. Iterate and Sync Pages
        for i, page in enumerate(reader.pages):
            page_num = i + 1
            print(f"[*] Processing page {page_num}/{num_pages}...", end="\r")
            
            text = page.extract_text()
            if not text or not text.strip():
                print(f"\n[!] Page {page_num} is an image or empty. Skipping content extraction.")
                # We still create the page with a notice to maintain order
                html_content = self.client.create_block("paragraph", f"[Image-only content on Page {page_num}]")
                page_title = f"Page {page_num} (Image)"
            else:
                # 1. Initial line extraction
                raw_lines = [line.strip() for line in text.split("\n") if line.strip()]
                
                # 2. Smart Deduplication & Page Number Removal
                filtered_lines = []
                seen_on_page = set()
                
                for line in raw_lines:
                    # Skip standalone page numbers (e.g., "7")
                    if line.isdigit():
                        continue
                    
                    # Deduplicate repeating titles/headers
                    if line.lower() in seen_on_page:
                        continue
                    
                    filtered_lines.append(line)
                    seen_on_page.add(line.lower())

                # 3. Intelligent Paragraph Joining
                combined_paragraphs = []
                current_para = ""
                
                for i, line in enumerate(filtered_lines):
                    # Heuristic: If a line is short (< 40 chars) and doesn't end with punctuation, 
                    # it's likely a header or title. Break paragraph here.
                    is_short_header = len(line) < 40 and line[-1] not in ".!?"
                    
                    if is_short_header:
                        if current_para:
                            combined_paragraphs.append(current_para)
                        combined_paragraphs.append(line)
                        current_para = ""
                        continue

                    current_para += (" " if current_para else "") + line
                    
                    # If this ends with sentence punctuation, close the paragraph
                    if line[-1] in ".!?":
                        combined_paragraphs.append(current_para)
                        current_para = ""
                
                if current_para:
                    combined_paragraphs.append(current_para)

                # 4. Transform to BlockNote format
                blocks = []
                first_heading = None
                for para in combined_paragraphs:
                    # HEURISTIC: Very short paragraphs (< 50 chars) that don't end in punctuation are headings
                    is_heading = len(para) < 50 and para[-1] not in ".!?"
                    if is_heading:
                        if not first_heading:
                            first_heading = para
                        blocks.append(self.client.create_block("heading", para, {"level": 2}))
                    else:
                        blocks.append(self.client.create_block("paragraph", para))

                page_title = f"Page {page_num}: {first_heading}" if first_heading else f"Page {page_num}"
                html_content = "".join(blocks)
            
            try:
                self.client.sync_page(nb_id, page_title, html_content)
            except Exception as e:
                print(f"\n[!] Error on page {page_num}: {e}")
                continue
                
        print(f"\n[+] Success! Ingested {num_pages} pages into '{notebook_title}'.")

def main():
    parser = argparse.ArgumentParser(description="Ingest a PDF into your Notebook.")
    parser.add_argument("--path", required=True, help="Path to the PDF file.")
    parser.add_argument("--title", help="Target notebook title.")
    parser.add_argument("--key", help="API Key (overrides env var).")
    
    args = parser.parse_args()
    
    try:
        client = NotebookSkillClient(api_key=args.key)
        skill = PDFIngestSkill(client)
        skill.ingest_pdf(args.path, args.title)
    except Exception as e:
        print(f"[!] Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
