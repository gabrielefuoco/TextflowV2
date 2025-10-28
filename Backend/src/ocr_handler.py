import logging
import io
import base64
import re
import binascii
from pathlib import Path
from typing import List, Dict, Tuple

from mistralai import Mistral, models

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

TEMP_ATTACHMENT_DIR = Path("/tmp/textflow_attachments")
TEMP_ATTACHMENT_DIR.mkdir(exist_ok=True)

def clean_filename(name: str) -> str:
    """Rimuove caratteri non validi per un nome di file o cartella."""
    name = re.sub(r'[<>:"/\\|?*]', '_', name)
    return name

def save_image(base64_str: str, img_id: str, output_dir: Path) -> str | None:
    """Decodifica e salva un'immagine base64, restituendo il nome del file."""
    try:
        if "data:" in base64_str:
            header, base64_data = base64_str.split(",", 1)
            ext = header.split("/")[1].split(";")[0]
        else:
            base64_data = base64_str
            ext = "jpg" # Default

        image_data = base64.b64decode(base64_data)
        clean_id = clean_filename(img_id)
        output_filename = f"{clean_id}.{ext}"
        full_path = output_dir / output_filename

        with open(full_path, "wb") as f:
            f.write(image_data)
        return output_filename
    except (IOError, binascii.Error, ValueError) as e:
        logger.error(f"Errore nel salvataggio dell'immagine {img_id}: {e}")
        return None

def process_pdf_to_markdown(pdf_bytes: bytes, file_name: str, job_id: str, mistral_api_key: str) -> Tuple[str, Path]:
    """
    Converte un PDF in Markdown, estrae le immagini, le salva in una cartella temporanea
    specifica per il job e aggiorna i link nel markdown.
    """
    if not mistral_api_key:
        raise ValueError("MISTRAL_API_KEY non configurata.")

    client = Mistral(api_key=mistral_api_key)
    
    # Crea una directory unica per gli allegati di questo file in questo job
    cleaned_file_stem = clean_filename(Path(file_name).stem)
    attachments_path = TEMP_ATTACHMENT_DIR / job_id / cleaned_file_stem
    attachments_path.mkdir(parents=True, exist_ok=True)

    try:
        logger.info(f"Processando '{file_name}' con OCR (Job: {job_id}).")
        
        # Carica il file e ottieni l'URL firmato
        uploaded_file = client.files.upload(
            file={"file_name": file_name, "content": pdf_bytes},
            purpose="ocr"
        )
        signed_url = client.files.get_signed_url(file_id=uploaded_file.id, expiry=1)

        # Esegui l'OCR, questa volta chiedendo le immagini
        ocr_response = client.ocr.process(
            document=models.DocumentURLChunk(document_url=signed_url.url),
            model="mistral-ocr-latest",
            include_image_base64=True
        )

        markdown_pages = []
        for page in ocr_response.pages:
            markdown_page = page.markdown
            if page.images:
                images_dict = {img.id: img.image_base64 for img in page.images}
                # Aggiorna il markdown con i link relativi corretti per lo zip finale
                for img_id, base64_str in images_dict.items():
                    saved_filename = save_image(base64_str, img_id, attachments_path)
                    if saved_filename:
                        placeholder = f"![{img_id}]({img_id})"
                        # Sintassi Obsidian-friendly per lo zip finale
                        replacement = f"![[Allegati/{cleaned_file_stem}/{saved_filename}]]"
                        markdown_page = markdown_page.replace(placeholder, replacement)
            markdown_pages.append(markdown_page)
        
        # Pulisci il file temporaneo su Mistral
        client.files.delete(file_id=uploaded_file.id)

        full_markdown = "\n\n".join(markdown_pages)
        return full_markdown, attachments_path

    except Exception as e:
        logger.error(f"Errore critico durante l'OCR di '{file_name}': {e}", exc_info=True)
        error_markdown = f"## ERRORE OCR\n\nImpossibile processare il file '{file_name}'.\n\nDettagli: {e}"
        return error_markdown, attachments_path
