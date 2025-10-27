# api/models.py
from pydantic import BaseModel, Field
from typing import Dict, Literal

class LLMConfig(BaseModel):
    """Configurazione per il Large Language Model."""
    model_name: str = Field(
        default="models/gemini-flash-lite-latest",
        description="Il nome del modello Gemini da utilizzare."
    )
    temperature: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="La 'creatività' del modello. Valori più alti generano risposte più varie."
    )

class ChunkingConfig(BaseModel):
    """Configurazione per la strategia di divisione del testo (chunking)."""
    max_words: int = Field(
        default=1000,
        gt=0,
        description="Numero massimo di parole per ogni chunk."
    )
    min_words: int = Field(
        default=300,
        gt=0,
        description="Numero minimo di parole per ogni chunk, usato per l'accorpamento."
    )

class ProcessingRequest(BaseModel):
    """Il modello completo per una richiesta di elaborazione."""
    prompts: Dict[str, str] = Field(
        default_factory=dict,
        description="Dizionario di prompt, dove la chiave è il nome e il valore è il template del prompt."
    )
    normalize_text: bool = Field(
        default=True,
        description="Se True, applica la normalizzazione al testo prima dell'elaborazione."
    )
    order_mode: Literal["chunk", "prompt"] = Field(
        default="chunk",
        description="Ordina l'output per chunk o per prompt."
    )
    llm_config: LLMConfig = Field(default_factory=LLMConfig)
    chunking_config: ChunkingConfig = Field(default_factory=ChunkingConfig)
