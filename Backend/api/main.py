import uuid
from io import BytesIO
from typing import List, Dict, Literal
from collections import OrderedDict
from pathlib import Path
import logging

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Form
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field

# Importa i nuovi modelli e la logica esistente
from api.models import LLMConfig, ChunkingConfig, ProcessChunksRequest, ChunkingResponse
from api.config import settings
from src.text_processor import process_chunks
from src.ocr_handler import process_pdf_to_markdown
from src.text_normalizer import normalize_text
from src.chunking_strategy import get_splitter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# --- Stato dei Job (Invariato) ---
class JobStatus(BaseModel):
    job_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    detail: str | None = None

JOBS: Dict[str, Dict] = {}

# --- Task in Background (Modificato per usare i chunk) ---
def process_chunks_in_background(job_id: str, request: ProcessChunksRequest):
    logger.info(f"Job {job_id}: Inizio elaborazione in background per {len(request.chunks)} chunk da '{request.file_name}'.")
    JOBS[job_id]['status'] = 'processing'

    try:
        output_filename, output_content = process_chunks(
            chunks=request.chunks,
            file_name=request.file_name,
            prompts=OrderedDict(request.prompts),
            model_config=request.llm_config.dict(),
            google_api_key=settings.google_api_key,
            order_mode=request.order_mode
        )
        JOBS[job_id]['status'] = 'completed'
        JOBS[job_id]['result'] = {output_filename: output_content.encode('utf-8')}
        logger.info(f"Job {job_id}: Elaborazione completata.")
    except Exception as e:
        logger.error(f"Job {job_id}: ERRORE CRITICO. Dettagli: {e}", exc_info=True)
        JOBS[job_id]['status'] = 'failed'
        JOBS[job_id]['detail'] = f"Errore: {type(e).__name__} - {e}"

# --- API Endpoints ---
app = FastAPI(title="TextFlow V2 - Manual Control API")

@app.post("/chunk", tags=["1. Chunking"], response_model=ChunkingResponse)
async def chunk_file(
    file: UploadFile = File(...),
    max_words: int = Form(1000),
    min_words: int = Form(300),
    normalize_text_flag: bool = Form(True)
):
    """
    Endpoint SINCRONO. Prende UN file, lo processa e restituisce i chunk.
    Il frontend chiamerà questo endpoint per popolare l'editor.
    """
    file_bytes = await file.read()
    file_name = file.filename
    logger.info(f"Inizio chunking per il file: {file_name}")

    # Pipeline di Preprocessing
    if Path(file_name).suffix.lower() == '.pdf':
        content_str = process_pdf_to_markdown(
            pdf_bytes=file_bytes, file_name=file_name,
            ocr_config={}, mistral_api_key=settings.mistral_api_key
        )
    else:
        content_str = file_bytes.decode("utf-8")

    if normalize_text_flag:
        content_str = normalize_text(content_str)

    # Splitting
    chunking_config = ChunkingConfig(max_words=max_words, min_words=min_words)
    splitter = get_splitter(chunking_config.dict())
    chunks = splitter.split(content_str)

    logger.info(f"File '{file_name}' diviso in {len(chunks)} chunk.")
    return ChunkingResponse(file_name=file_name, chunks=chunks)

@app.post("/process-chunks", tags=["2. Processing"], status_code=202, response_model=JobStatus)
async def start_processing_edited_chunks(
    background_tasks: BackgroundTasks,
    request: ProcessChunksRequest
):
    """
    Avvia il job di elaborazione ASINCRONO partendo da una lista di chunk fornita.
    """
    job_id = str(uuid.uuid4())
    JOBS[job_id] = {"status": "pending", "detail": "Job creato e in attesa."}
    background_tasks.add_task(process_chunks_in_background, job_id, request)
    logger.info(f"Nuovo job creato con ID: {job_id} da chunk pre-elaborati.")
    return JobStatus(job_id=job_id, status="pending", detail="Job in coda.")

@app.get("/results/{job_id}", tags=["3. Results"])
async def get_job_results(job_id: str):
    """
    Endpoint di polling per i risultati. Semplificato per restituire sempre un file singolo.
    """
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job ID non trovato.")

    status = job['status']
    if status in ["pending", "processing"]:
        # Restituisce lo stato JSON se non è pronto
        return JSONResponse(content=JobStatus(job_id=job_id, status=status, detail=job.get('detail')).dict())

    if status == "failed":
        raise HTTPException(status_code=500, detail=f"Il Job è fallito: {job.get('detail')}")

    processed_outputs = job.get('result')
    if not processed_outputs:
        raise HTTPException(status_code=500, detail="Job completato ma senza risultati.")

    # Restituisce il file markdown
    filename, content = list(processed_outputs.items())[0]
    return StreamingResponse(
        BytesIO(content),
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
    )
