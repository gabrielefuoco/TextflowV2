import uuid
import zipfile
from io import BytesIO
from typing import List, Dict, OrderedDict, Literal
from pathlib import Path
import logging

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Form
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

from api.models import ProcessChunksRequest, MultiProcessRequest, ChunkingResponse, ChunkingConfig
from api.config import settings
from src.text_processor import process_chunks
from src.ocr_handler import process_pdf_to_markdown
from src.text_normalizer import normalize_text
from src.chunking_strategy import get_splitter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# --- Stato dei Job (Invariato) ---
class JobStatus(BaseModel):
    status: Literal["pending", "processing", "completed", "failed"]
    detail: str | None = None

JOBS: Dict[str, Dict] = {}

# --- Task in Background Universale ---
def universal_background_processor(job_id: str, request: MultiProcessRequest):
    logger.info(f"Job {job_id}: Inizio Universal Processing per {len(request.files_to_process)} file.")
    JOBS[job_id]['status'] = 'processing'
    try:
        processed_outputs: Dict[str, bytes] = {}
        total_files = len(request.files_to_process)
        for i, file_task in enumerate(request.files_to_process):
            task_name = file_task.file_name
            logger.info(f"Job {job_id} [{i+1}/{total_files}]: Processo '{task_name}'")
            JOBS[job_id]['detail'] = f"Processing file {i+1}/{total_files}: {task_name}"

            # La logica di processamento è già perfettamente isolata in process_chunks. La invochiamo.
            output_filename, output_content = process_chunks(
                chunks=file_task.chunks,
                file_name=task_name,
                prompts=OrderedDict(file_task.prompts),
                model_config=file_task.llm_config.dict(),
                order_mode=file_task.order_mode,
                google_api_key=settings.google_api_key
            )
            processed_outputs[output_filename] = output_content.encode('utf-8')

        JOBS[job_id]['status'] = 'completed'
        JOBS[job_id]['result'] = processed_outputs
        logger.info(f"Job {job_id}: Universal Processing completato.")
    except Exception as e:
        logger.error(f"Job {job_id}: ERRORE CRITICO. Dettagli: {e}", exc_info=True)
        JOBS[job_id]['status'] = 'failed'
        JOBS[job_id]['detail'] = f"Errore durante il processamento: {type(e).__name__}"

# --- API Endpoints ---
app = FastAPI(title="TextFlow V3 - Universal Control API")

@app.post("/chunk", tags=["1. Chunking"], response_model=List[ChunkingResponse])
async def chunk_files(
    files: List[UploadFile] = File(...),
    max_words: int = Form(1000),
    min_words: int = Form(300),
    normalize_text_flag: bool = Form(True)
):
    """
    Endpoint SINCRONO. Prende FILE MULTIPLI, li mastica e sputa fuori una lista di oggetti,
    ognuno contenente il nome del file e i suoi chunk.
    """
    if not files:
        raise HTTPException(status_code=400, detail="Nessun fottuto file fornito.")
    
    responses = []
    chunking_config = ChunkingConfig(max_words=max_words, min_words=min_words)
    splitter = get_splitter(chunking_config.dict())

    for file in files:
        file_bytes = await file.read()
        file_name = file.filename
        logger.info(f"Chunking in corso per: {file_name}")

        content_str = ""
        if Path(file_name).suffix.lower() == '.pdf':
            content_str = process_pdf_to_markdown(pdf_bytes=file_bytes, file_name=file_name, ocr_config={}, mistral_api_key=settings.mistral_api_key)
        else:
            try:
                content_str = file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                raise HTTPException(status_code=400, detail=f"Impossibile decodificare il file '{file_name}' come UTF-8.")

        if normalize_text_flag:
            content_str = normalize_text(content_str)

        chunks = splitter.split(content_str)
        responses.append(ChunkingResponse(file_name=file_name, chunks=chunks))

    return responses

@app.post("/process", tags=["2. Processing"], status_code=202)
async def start_universal_processing_job(
    background_tasks: BackgroundTasks,
    request: MultiProcessRequest
):
    """
    Endpoint ASINCRONO universale. Riceve una lista di file con i loro chunk (modificati o meno)
    e lancia un singolo job in background per processarli tutti.
    """
    if not request.files_to_process:
        raise HTTPException(status_code=400, detail="La lista dei file da processare è vuota.")

    job_id = str(uuid.uuid4())
    JOBS[job_id] = {"status": "pending", "detail": f"Job creato per {len(request.files_to_process)} file."}
    background_tasks.add_task(universal_background_processor, job_id, request)
    logger.info(f"Nuovo job universale creato con ID: {job_id}")
    return {"job_id": job_id, "status": "pending"}

@app.get("/results/{job_id}", tags=["3. Results"])
async def get_job_results(job_id: str):
    """
    Endpoint di polling. Restituisce lo stato del job o il risultato finale.
    Gestisce automaticamente l'output singolo (markdown) o multiplo (zip).
    """
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job ID non trovato.")

    status = job['status']
    if status in ["pending", "processing"]:
        return JSONResponse(content={"job_id": job_id, "status": status, "detail": job.get('detail')})

    if status == "failed":
        raise HTTPException(status_code=500, detail=job.get('detail', 'Job fallito senza dettagli.'))

    processed_outputs = job.get('result')
    if not processed_outputs:
        raise HTTPException(status_code=500, detail="Job completato ma senza risultati.")

    if len(processed_outputs) > 1:
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for filename, content in processed_outputs.items():
                zf.writestr(filename, content)
        zip_buffer.seek(0)
        return StreamingResponse(zip_buffer, media_type="application/zip", headers={"Content-Disposition": "attachment; filename=\"processed_documents.zip\""})
    else:
        filename, content = list(processed_outputs.items())[0]
        return StreamingResponse(BytesIO(content), media_type="text/markdown", headers={"Content-Disposition": f"attachment; filename=\"{filename}\""})
