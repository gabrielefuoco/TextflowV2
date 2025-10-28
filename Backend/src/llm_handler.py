import asyncio
from llama_index.llms.gemini import Gemini
from llama_index.core import PromptTemplate
from typing import Dict, Any

def get_llm(model_config: Dict[str, Any], google_api_key: str) -> Gemini:
    """Inizializza e restituisce un'istanza del modello LLM di Gemini."""
    if not google_api_key:
        raise ValueError("API key di Google non fornita.")
    return Gemini(
        model_name=model_config.get("model_name", "models/gemini-1.5-flash-latest"),
        api_key=google_api_key,
        temperature=model_config.get("temperature", 0.7)
    )

def call_llm_with_prompt(llm: Gemini, prompt_template_str: str, text_chunk: str) -> str:
    """
    [DEPRECATA] Versione sincrona. Lasciamola per compatibilità o la buttiamo.
    """
    try:
        prompt_template = PromptTemplate(prompt_template_str)
        formatted_prompt = prompt_template.format(text_chunk=text_chunk)
        response = llm.complete(formatted_prompt)
        return response.text
    except Exception as e:
        print(f"Errore durante la chiamata all'LLM: {e}")
        raise e

# --- NUOVA FUNZIONE ASINCRONA ---
async def call_llm_with_prompt_async(llm: Gemini, prompt_template_str: str, text_chunk: str) -> str:
    """
    Formatta un prompt con un chunk di testo e chiama l'LLM in modo ASINCRONO.
    Usa 'acomplete' invece di 'complete'.
    """
    try:
        prompt_template = PromptTemplate(prompt_template_str)
        formatted_prompt = prompt_template.format(text_chunk=text_chunk)
        # La magia è qui: `await llm.acomplete()`
        response = await llm.acomplete(formatted_prompt)
        return response.text
    except Exception as e:
        print(f"Errore durante la chiamata asincrona all'LLM: {e}")
        # L'eccezione verrà gestita dal chiamante
        raise e
