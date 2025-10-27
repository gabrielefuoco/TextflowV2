# api/main.py
import uuid
import zipfile
from io import BytesIO
from typing import List, Dict, OrderedDict, Literal
from pathlib import Path
import logging

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Form, BackgroundTasks
from fastapi.responses import StreamingResponse
from starlette.status import HTTP_202_ACCEPTED, HTTP_400_BAD_REQUEST, HTTP_404_NOT_FOUND, HTTP_500_INTERNAL_SERVER_ERROR
from pydantic import BaseModel

from api.models import ProcessingRequest
from api.config import settings

from src.text_processor import process_single_file
from src.ocr_handler import process_pdf_to_markdown
from src.text_normalizer import normalize_text

# Configura un logger decente
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


# --- Modelli di Stato e Job Store ---

class JobStatus(BaseModel):
    """Modello per rappresentare lo stato di un job."""
    job_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    detail: str | None = None
    # In un sistema reale, qui avresti anche timestamp, etc.

# Il nostro "database" in-memoria. La chiave è il job_id.
# Il valore è un dizionario che conterrà lo stato e il risultato.
JOBS: Dict[str, Dict] = {}


# --- Funzione del Task in Background ---

def process_files_in_background(job_id: str, files_data: List[Dict], config: ProcessingRequest):
    """
    Questa è la funzione che fa il lavoro pesante. Viene eseguita in background.
    NON può interagire con il client. Il suo unico scopo è aggiornare lo store dei job.
    """
    logger.info(f"Job {job_id}: Inizio elaborazione in background per {len(files_data)} file.")
    JOBS[job_id]['status'] = 'processing'

    try:
        processed_outputs: Dict[str, bytes] = {}
        for file_data in files_data:
            file_name = file_data["filename"]
            file_bytes = file_data["content"]

            logger.info(f"Job {job_id}: Processo il file: {file_name}")

            # La tua logica di pipeline, identica a prima
            if Path(file_name).suffix.lower() == '.pdf':
                content_str = process_pdf_to_markdown(
                    pdf_bytes=file_bytes,
                    file_name=file_name,
                    ocr_config={}, # Semplificato per l'esempio
                    mistral_api_key=settings.mistral_api_key
                )
            else:
                content_str = file_bytes.decode("utf-8")

            if config.normalize_text:
                content_str = normalize_text(content_str)

            if config.prompts:
                output_filename, output_content = process_single_file(
                    file_content=content_str, file_name=file_name,
                    prompts=OrderedDict(config.prompts),
                    chunking_config=config.chunking_config.dict(),
                    model_config=config.llm_config.dict(),
                    order_mode=config.order_mode,
                    google_api_key=settings.google_api_key
                )
            else:
                output_filename = f"{Path(file_name).stem}_processed.md"
                output_content = content_str

            processed_outputs[output_filename] = output_content.encode('utf-8')

        # Lavoro completato con successo. Salva i risultati nello store.
        JOBS[job_id]['status'] = 'completed'
        JOBS[job_id]['result'] = processed_outputs
        logger.info(f"Job {job_id}: Elaborazione completata con successo.")

    except Exception as e:
        # Qualcosa è andato storto. Registra il fallimento.
        logger.error(f"Job {job_id}: ERRORE CRITICO durante l'elaborazione. Dettagli: {e}", exc_info=True)
        JOBS[job_id]['status'] = 'failed'
        JOBS[job_id]['detail'] = f"Errore durante l'elaborazione: {type(e).__name__} - {e}"


# --- Refactoring dell'API ---

app = FastAPI(title="TextFlow V2 Robust API")

# Dependency Injection per la configurazione (invariata)
def get_processing_request(request_str: str = Form(...)) -> ProcessingRequest:
    try:
        # FastAPI fa il parsing della stringa JSON e la valida contro il modello
        return ProcessingRequest.parse_raw(request_str)
    except Exception as e:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"JSON di configurazione invalido: {e}"
        )

@app.post("/process", tags=["Processing"], status_code=HTTP_202_ACCEPTED, response_model=JobStatus)
async def start_processing_job(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    config: ProcessingRequest = Depends(get_processing_request)
):
    """
    Avvia un nuovo job di elaborazione in background e restituisce subito un ID.
    """
    job_id = str(uuid.uuid4())

    # Leggi i file in memoria PRIMA di passare al task, l'oggetto UploadFile non sarà più valido.
    files_data = [{"content": await f.read(), "filename": f.filename} for f in files]

    # Crea il job nello store
    JOBS[job_id] = {"status": "pending", "detail": "Job creato e in attesa di essere processato."}

    # Schedula il task in background
    background_tasks.add_task(process_files_in_background, job_id, files_data, config)

    logger.info(f"Nuovo job creato con ID: {job_id}")
    return JobStatus(job_id=job_id, status="pending", detail="Job creato e in attesa di essere processato.")


@app.get("/results/{job_id}", tags=["Processing"])
async def get_job_results(job_id: str):
    """
    Controlla lo stato di un job. Se completato, restituisce i file risultanti.
    """
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="Job ID non trovato.")

    status = job['status']
    logger.info(f"Richiesta di stato per il Job {job_id}. Stato attuale: {status}")

    if status in ["pending", "processing"]:
        return JobStatus(job_id=job_id, status=status, detail=job.get('detail'))

    if status == "failed":
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Il Job è fallito: {job.get('detail')}"
        )

    # Se siamo qui, il job è 'completed'
    processed_outputs = job.get('result')
    if not processed_outputs:
         raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Job completato ma senza risultati.")

    # Restituisce il file singolo o lo zip, come prima
    if len(processed_outputs) == 1:
        filename, content = list(processed_outputs.items())[0]
        media_type = "text/markdown" if filename.endswith(".md") else "text/plain"
        return StreamingResponse(BytesIO(content), media_type=media_type, headers={"Content-Disposition": f"attachment; filename=\"{filename}\""})
    else:
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for filename, content in processed_outputs.items():
                zf.writestr(filename, content)
        zip_buffer.seek(0)
        return StreamingResponse(zip_buffer, media_type="application/zip", headers={"Content-Disposition": "attachment; filename=\"processed_documents.zip\""})
