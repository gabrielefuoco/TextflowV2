import logging
from pathlib import Path
from typing import Dict, OrderedDict, Tuple, List
from .chunking_strategy import get_splitter
from .llm_handler import get_llm, call_llm_with_prompt

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

def process_chunks(
    chunks: List[str], file_name: str, prompts: OrderedDict,
    model_config: Dict, order_mode: str = "chunk"
) -> Tuple[str, str]:
    """Elabora una lista di chunk di testo pre-esistenti e restituisce il risultato."""
    logging.info(f"Inizio elaborazione LLM per {len(chunks)} chunk pre-calcolati di: {file_name}")
    
    if not chunks:
        logging.warning(f"Nessun chunk fornito per il file '{file_name}'.")
        return f"{Path(file_name).stem}.md", "# ATTENZIONE: Nessun contenuto da processare."

    llm = get_llm(model_config)
    results = {}
    for chunk_idx, chunk in enumerate(chunks, start=1):
        for prompt_name, prompt_text in prompts.items():
            logging.info(f"Processing chunk {chunk_idx}/{len(chunks)} di '{file_name}' con prompt '{prompt_name}'")
            try:
                response = call_llm_with_prompt(llm, prompt_text, chunk)
                results[(chunk_idx, prompt_name)] = response
            except Exception as e:
                logging.error(f"Errore durante l'elaborazione del chunk {chunk_idx} per '{file_name}': {e}")
                results[(chunk_idx, prompt_name)] = f"ERRORE: Impossibile processare il chunk. Dettagli: {e}"

    output_content = compile_results_to_string(results, prompts, order_mode)
    output_filename = f"{Path(file_name).stem}.md"
    logging.info(f"Elaborazione LLM di '{file_name}' completata.")
    return output_filename, output_content

def process_single_file(
    file_content: str, file_name: str, prompts: OrderedDict,
    chunking_config: Dict, model_config: Dict, order_mode: str = "chunk"
) -> Tuple[str, str]:
    """Divide il contenuto di un file in chunk e poi li elabora."""
    logging.info(f"Eseguo lo splitting per: {file_name}")
    splitter = get_splitter(chunking_config)
    chunks = splitter.split(file_content)
    logging.info(f"Contenuto di '{file_name}' diviso in {len(chunks)} chunk.")
    
    return process_chunks(chunks, file_name, prompts, model_config, order_mode)


def compile_results_to_string(
    results: Dict[Tuple[int, str], str], prompts: OrderedDict, order_mode: str
) -> str:
    """Compila i risultati in una singola stringa Markdown."""
    lines = []
    num_chunks = max((k[0] for k in results.keys()), default=0)
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