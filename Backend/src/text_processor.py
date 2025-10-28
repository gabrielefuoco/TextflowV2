import asyncio
import logging
from pathlib import Path
from typing import Dict, OrderedDict, Tuple, List
from .llm_handler import get_llm, call_llm_with_prompt_async

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# SEMAFORO PER IL RATE LIMITING
# Limite Gemini: 15 req/min. Stiamo a 14 per sicurezza.
# Questo limiterà a 14 le chiamate concorrenti in un dato istante.
RATE_LIMIT_SEMAPHORE = asyncio.Semaphore(14)

async def process_single_chunk_with_limiter(
    llm: "Gemini", chunk_idx: int, total_chunks: int, chunk: str, prompt_name: str, prompt_text: str, file_name: str
) -> Tuple[Tuple[int, str], str]:
    """
    Wrapper per una singola chiamata API che usa il semaforo per il rate limiting.
    Restituisce una tupla con la chiave e il risultato per un facile riassemblaggio.
    """
    async with RATE_LIMIT_SEMAPHORE:
        logging.info(f"Processing chunk {chunk_idx}/{total_chunks} di '{file_name}' con prompt '{prompt_name}'")
        try:
            response = await call_llm_with_prompt_async(llm, prompt_text, chunk)
            # Aggiungiamo un piccolo delay dopo ogni chiamata per non essere troppo aggressivi.
            # Rilascia il semaforo dopo 4 secondi (60s / 15 req = 4s/req).
            await asyncio.sleep(4)
            return (chunk_idx, prompt_name), response
        except Exception as e:
            logging.error(f"Errore durante l'elaborazione del chunk {chunk_idx} per '{file_name}': {e}")
            return (chunk_idx, prompt_name), f"ERRORE: Impossibile processare il chunk. Dettagli: {e}"

async def process_chunks_async(
    chunks: List[str], file_name: str, prompts: OrderedDict,
    model_config: Dict, google_api_key: str, order_mode: str = "chunk"
) -> Tuple[str, str]:
    """
    Elabora una lista di chunk di testo in modo asincrono e concorrente,
    rispettando il rate limiting.
    """
    logging.info(f"Inizio elaborazione ASINCRONA per {len(chunks)} chunk di: {file_name}")
    
    if not chunks:
        logging.warning(f"Nessun chunk fornito per il file '{file_name}'.")
        return f"{Path(file_name).stem}.md", "# ATTENZIONE: Nessun contenuto da processare."

    llm = get_llm(model_config, google_api_key)
    
    # Creiamo una lista di tutte le "task" da eseguire (una per ogni chunk/prompt)
    tasks = []
    total_chunks = len(chunks)
    for chunk_idx, chunk in enumerate(chunks, start=1):
        if not chunk.strip(): continue # Salta chunk vuoti
        for prompt_name, prompt_text in prompts.items():
            tasks.append(
                process_single_chunk_with_limiter(llm, chunk_idx, total_chunks, chunk, prompt_name, prompt_text, file_name)
            )

    # Eseguiamo tutte le task in concorrenza.
    # `asyncio.gather` aspetterà che tutte siano completate.
    results_list = await asyncio.gather(*tasks)
    
    # Riconvertiamo la lista di risultati in un dizionario
    results = dict(results_list)

    output_content = compile_results_to_string(results, prompts, order_mode, len(chunks))
    output_filename = f"{Path(file_name).stem}.md"
    logging.info(f"Elaborazione ASINCRONA di '{file_name}' completata.")
    return output_filename, output_content

def compile_results_to_string(
    results: Dict[Tuple[int, str], str], prompts: OrderedDict, order_mode: str, num_chunks: int
) -> str:
    """Compila i risultati in una singola stringa Markdown."""
    lines = []
    # Usiamo num_chunks passato come argomento invece di calcolarlo
    if order_mode == "chunk":
        for chunk_idx in range(1, num_chunks + 1):
            for prompt_name in prompts.keys():
                response = results.get((chunk_idx, prompt_name), "")
                lines.append(response)
                lines.append("\n---\n")
    else: # order_mode == "prompt"
        for prompt_name in prompts.keys():
            lines.append(f"# Risultati per Prompt: {prompt_name}\n\n")
            for chunk_idx in range(1, num_chunks + 1):
                response = results.get((chunk_idx, prompt_name), "")
                lines.append(response)
                lines.append("\n---\n")
    return "\n".join(lines)
