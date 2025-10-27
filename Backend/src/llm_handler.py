import os
from llama_index.llms.gemini import Gemini
from llama_index.core import PromptTemplate
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

def get_llm(model_config: Dict[str, Any]) -> Gemini:
    """Inizializza e restituisce un'istanza del modello LLM di Gemini."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY non trovata. Assicurati che sia nel file .env.")
    return Gemini(
        model_name=model_config.get("model_name", "models/gemini-flash-lite-latest"),
        api_key=api_key,
        temperature=model_config.get("temperature", 0.7)
    )

def call_llm_with_prompt(llm: Gemini, prompt_template_str: str, text_chunk: str) -> str:
    """Formatta un prompt con un chunk di testo e chiama l'LLM."""
    try:
        prompt_template = PromptTemplate(prompt_template_str)
        formatted_prompt = prompt_template.format(text_chunk=text_chunk)
        response = llm.complete(formatted_prompt)
        return response.text
    except Exception as e:
        print(f"Errore durante la chiamata all'LLM: {e}")
        # L'eccezione verrà gestita dal chiamante (processing_engine)
        raise e
