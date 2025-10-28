import asyncio
import uuid
import zipfile
from io import BytesIO
from typing import List, Dict, OrderedDict, Literal
from pathlib import Path
import logging
import shutil

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Form
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

from api.models import ProcessChunksRequest, MultiProcessRequest, ChunkingResponse, ChunkingConfig
from api.config import settings
from src.text_processor import process_chunks_async
from src.ocr_handler import process_pdf_to_markdown, TEMP_ATTACHMENT_DIR
from src.text_normalizer import normalize_text
from src.chunking_strategy import get_splitter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Stato dei Job
class JobStatus(BaseModel):
    status: Literal["pending", "processing", "completed", "failed"]
    detail: str | None = None

JOBS: Dict[str, Dict] = {}

async def universal_background_processor_async(job_id: str, request: MultiProcessRequest):
    logger.info(f"Job {job_id}: Inizio Universal Processing per {len(request.files_to_process)} file.")
    JOBS[job_id]['status'] = 'processing'
    try:
        processed_outputs: Dict[str, bytes] = {}
        attachment_paths: List[str] = []

        if getattr(request, 'save_chunks_mode', False):
            logger.info(f"Job {job_id}: modalità save_chunks_mode attiva. Salvataggio dei chunk come file separati.")
            for file_task in request.files_to_process:
                file_stem = Path(file_task.file_name).stem
                for idx, chunk in enumerate(file_task.chunks):
                    if file_task.chunk_names and idx < len(file_task.chunk_names):
                        filename = f"{file_task.chunk_names[idx]}.md"
                    else:
                        filename = f"{file_stem} - PT. {idx + 1}.md"
                    processed_outputs[filename] = chunk.encode('utf-8')

                if getattr(file_task, 'attachment_path', None):
                    attachment_paths.append(file_task.attachment_path)  # type: ignore[arg-type]
        else:
            tasks = []
            for file_task in request.files_to_process:
                if file_task.prompts:
                    task = process_chunks_async(
                        chunks=file_task.chunks,
                        file_name=file_task.file_name,
                        prompts=OrderedDict(file_task.prompts),
                        model_config=file_task.llm_config.dict(),
                        order_mode=file_task.order_mode,
                        google_api_key=settings.google_api_key
                    )
                    tasks.append(task)
                else:
                    output_filename = f"{Path(file_task.file_name).stem}.md"
                    output_content = "\n\n---\n\n".join(file_task.chunks)
                    processed_outputs[output_filename] = output_content.encode('utf-8')

                if getattr(file_task, 'attachment_path', None):
                    attachment_paths.append(file_task.attachment_path)  # type: ignore[arg-type]

            if tasks:
                results = await asyncio.gather(*tasks)
                for output_filename, output_content in results:
                    processed_outputs[output_filename] = output_content.encode('utf-8')

        JOBS[job_id]['status'] = 'completed'
        JOBS[job_id]['result'] = {
            "markdown": processed_outputs,
            "attachments": attachment_paths
        }
        logger.info(f"Job {job_id}: Universal Processing completato.")

    except Exception as e:
        logger.error(f"Job {job_id}: ERRORE CRITICO. Dettagli: {e}", exc_info=True)
        JOBS[job_id]['status'] = 'failed'
        JOBS[job_id]['detail'] = f"Errore durante il processamento: {type(e).__name__}"


# API Endpoints
app = FastAPI(title="TextFlow V3 - Universal Control API")

@app.post("/chunk", tags=["1. Chunking"], response_model=List[ChunkingResponse])
async def chunk_files(
    files: List[UploadFile] = File(...),
    max_words: int = Form(1000),
    min_words: int = Form(300),
    normalize_text_flag: bool = Form(True)
):
    if not files:
        raise HTTPException(status_code=400, detail="Nessun file fornito.")
    
    responses = []
    chunking_config = ChunkingConfig(max_words=max_words, min_words=min_words)
    splitter = get_splitter(chunking_config.dict())
    
    # ID unico per questa richiesta di chunking per raggruppare gli allegati
    request_id = str(uuid.uuid4())

    for file in files:
        file_bytes = await file.read()
        file_name = file.filename
        logger.info(f"Chunking in corso per: {file_name}")

        content_str = ""
        attachment_path = None

        if Path(file_name).suffix.lower() == '.pdf':
            content_str, attachment_path_obj = process_pdf_to_markdown(
                pdf_bytes=file_bytes, 
                file_name=file_name, 
                job_id=request_id, 
                mistral_api_key=settings.mistral_api_key
            )
            attachment_path = str(attachment_path_obj)
        else:
            try:
                content_str = file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                raise HTTPException(status_code=400, detail=f"Impossibile decodificare il file '{file_name}' come UTF-8.")

        if normalize_text_flag:
            content_str = normalize_text(content_str)

        chunks = splitter.split(content_str)
        responses.append(ChunkingResponse(file_name=file_name, chunks=chunks, attachment_path=attachment_path))

    return responses

@app.post("/process", tags=["2. Processing"], status_code=202)
async def start_universal_processing_job(
    background_tasks: BackgroundTasks,
    request: MultiProcessRequest
):
    if not request.files_to_process:
        raise HTTPException(status_code=400, detail="La lista dei file da processare è vuota.")

    job_id = str(uuid.uuid4())
    JOBS[job_id] = {"status": "pending", "detail": f"Job creato per {len(request.files_to_process)} file.", "request_save_chunks_mode": getattr(request, 'save_chunks_mode', False)}
    background_tasks.add_task(universal_background_processor_async, job_id, request)
    logger.info(f"Nuovo job universale creato con ID: {job_id}")
    return {"job_id": job_id, "status": "pending"}

@app.get("/results/{job_id}", tags=["3. Results"])
async def get_job_results(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job ID non trovato.")

    status = job['status']
    if status in ["pending", "processing"]:
        return JSONResponse(content={"job_id": job_id, "status": status, "detail": job.get('detail')})

    if status == "failed":
        raise HTTPException(status_code=500, detail=job.get('detail', 'Job fallito senza dettagli.'))

    job_result = job.get('result')
    if not job_result:
        raise HTTPException(status_code=500, detail="Job completato ma senza risultati.")

    processed_outputs = job_result.get("markdown", {})
    attachment_paths = job_result.get("attachments", [])

    # Se c'è un solo file markdown e nessun allegato, restituisci solo il markdown (solo se non in save_chunks_mode)
    if len(processed_outputs) == 1 and not attachment_paths and not JOBS[job_id].get('request_save_chunks_mode'):
        filename, content = list(processed_outputs.items())[0]
        return StreamingResponse(BytesIO(content), media_type="text/markdown", headers={"Content-Disposition": f"attachment; filename=\"{filename}\""})
    
    # Altrimenti, crea sempre uno ZIP
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # Aggiungi i file markdown
        for filename, content in processed_outputs.items():
            zf.writestr(filename, content)
        
        # Aggiungi gli allegati
        if attachment_paths:
            allegati_root = Path("Allegati")
            for path_str in attachment_paths:
                path = Path(path_str)
                if path.is_dir():
                    for file_path in path.rglob('*'):
                        if file_path.is_file():
                            # Crea il percorso relativo per lo zip
                            arcname = allegati_root / path.name / file_path.name
                            zf.write(file_path, arcname=str(arcname))
    
    zip_buffer.seek(0)
    
    # Pulizia delle cartelle temporanee degli allegati per questo job
    unique_job_ids = {Path(p).parts[-2] for p in attachment_paths if len(Path(p).parts) > 1}
    for req_id in unique_job_ids:
        shutil.rmtree(TEMP_ATTACHMENT_DIR / req_id, ignore_errors=True)

    return StreamingResponse(zip_buffer, media_type="application/zip", headers={"Content-Disposition": "attachment; filename=\"processed_documents.zip\""})
