from pydantic import BaseModel, Field
from typing import Dict, List, Literal

class LLMConfig(BaseModel):
    """Configurazione per il Large Language Model."""
    model_name: str = Field(default="models/gemini-1.5-flash-latest")
    temperature: float = Field(default=0.7, ge=0.0, le=1.0)

class ChunkingConfig(BaseModel):
    """Configurazione per la strategia di divisione del testo."""
    max_words: int = Field(default=1000, gt=0)
    min_words: int = Field(default=300, gt=0)

# NUOVO MODELLO PER LA RICHIESTA DI PROCESSING DEI CHUNK
class ProcessChunksRequest(BaseModel):
    """Richiesta per processare una lista di chunk pre-esistenti e modificati dall'utente."""
    chunks: List[str] = Field(..., min_length=1, description="La lista di chunk di testo da processare.")
    file_name: str = Field(..., description="Il nome del file originale, per logging e output.")
    prompts: Dict[str, str] = Field(default_factory=dict)
    order_mode: Literal["chunk", "prompt"] = Field(default="chunk")
    llm_config: LLMConfig = Field(default_factory=LLMConfig)

# NUOVO MODELLO PER L'OUTPUT DEL CHUNKING
class ChunkingResponse(BaseModel):
    """Il modello di risposta per l'endpoint di chunking."""
    file_name: str
    chunks: List[str]
