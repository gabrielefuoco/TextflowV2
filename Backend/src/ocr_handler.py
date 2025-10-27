import logging
from pathlib import Path
from typing import List, Dict
from mistralai import Mistral, models
from pypdf import PdfReader, PdfWriter
import io

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def process_pdf_to_markdown(pdf_bytes: bytes, file_name: str, ocr_config: Dict, mistral_api_key: str) -> str:
    """Converte il contenuto di un PDF (in byte) in una stringa Markdown usando l'API OCR di Mistral."""
    if not mistral_api_key:
        logger.error("MISTRAL_API_KEY non trovata.")
        raise ValueError("MISTRAL_API_KEY non configurata.")

    client = Mistral(api_key=mistral_api_key)
    pdf_stream = io.BytesIO(pdf_bytes)

    try:
        max_size = ocr_config.get("max_chunk_size_mb", 40)
        pdf_parts_bytes = split_pdf_in_memory(pdf_stream, max_size_mb=max_size)

        if len(pdf_parts_bytes) > 1:
            logger.info(f"PDF '{file_name}' troppo grande, diviso in {len(pdf_parts_bytes)} parti per l'OCR.")

        full_markdown_content = []
        for i, part_bytes in enumerate(pdf_parts_bytes, 1):
            logger.info(f"Processando parte {i}/{len(pdf_parts_bytes)} di '{file_name}' con OCR.")

            uploaded_file = client.files.upload(
                file={"file_name": f"{Path(file_name).stem}_part{i}.pdf", "content": part_bytes},
                purpose="ocr"
            )

            signed_url = client.files.get_signed_url(file_id=uploaded_file.id, expiry=1)

            ocr_response = client.ocr.process(
                document=models.DocumentURLChunk(document_url=signed_url.url),
                model="mistral-ocr-latest",
                include_image_base64=False
            )

            part_markdown = "\n\n".join([page.markdown for page in ocr_response.pages])
            full_markdown_content.append(part_markdown)

            client.files.delete(file_id=uploaded_file.id)

        return "\n\n".join(full_markdown_content)

    except Exception as e:
        logger.error(f"Errore critico durante l'OCR di '{file_name}': {e}", exc_info=True)
        return f"## ERRORE OCR\n\nImpossibile processare il file '{file_name}'.\n\nDettagli: {e}"

def split_pdf_in_memory(pdf_stream: io.BytesIO, max_size_mb: int) -> List[bytes]:
    """Divide un PDF in memoria in parti più piccole, restituendo una lista di byte."""
    pdf_stream.seek(0)
    pdf_size_mb = len(pdf_stream.getvalue()) / (1024 * 1024)
    if pdf_size_mb <= max_size_mb:
        return [pdf_stream.getvalue()]

    pdf = PdfReader(pdf_stream)
    total_pages = len(pdf.pages)
    pages_per_chunk = max(1, int(total_pages * (max_size_mb / pdf_size_mb)))

    split_files_bytes = []
    for i in range(0, total_pages, pages_per_chunk):
        writer = PdfWriter()
        end_page = min(i + pages_per_chunk, total_pages)
        for page_num in range(i, end_page):
            writer.add_page(pdf.pages[page_num])

        part_buffer = io.BytesIO()
        writer.write(part_buffer)
        part_buffer.seek(0)
        split_files_bytes.append(part_buffer.getvalue())

    return split_files_bytes
