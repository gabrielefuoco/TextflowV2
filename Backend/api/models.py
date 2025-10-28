from pydantic import BaseModel, Field
from typing import Dict, List, Literal, Optional

class LLMConfig(BaseModel):
    """Configurazione per il Large Language Model."""
    model_name: str = Field(default="models/gemini-1.5-flash-latest")
    temperature: float = Field(default=0.7, ge=0.0, le=1.0)

class ChunkingConfig(BaseModel):
    """Configurazione per la strategia di divisione del testo."""
    max_words: int = Field(default=1000, gt=0)
    min_words: int = Field(default=300, gt=0)

class ProcessChunksRequest(BaseModel):
    """
    Rappresenta UN singolo file con i suoi chunk e la sua configurazione.
    Sarà un mattone per costruire la richiesta universale.
    """
    chunks: List[str]
    file_name: str
    chunk_names: Optional[List[str]] = None
    prompts: Dict[str, str] = Field(default_factory=dict)
    order_mode: Literal["chunk", "prompt"] = Field(default="chunk")
    llm_config: LLMConfig = Field(default_factory=LLMConfig)
    attachment_path: Optional[str] = None

class MultiProcessRequest(BaseModel):
    """
    Il payload definitivo per l'endpoint di processing universale.
    Contiene una lista di file, ognuno con i propri chunk pronti per essere processati.
    """
    files_to_process: List[ProcessChunksRequest]
    save_chunks_mode: bool = False

class ChunkingResponse(BaseModel):
    """Il modello di risposta per un singolo file processato dall'endpoint di chunking."""
    file_name: str
    chunks: List[str]
    attachment_path: Optional[str] = None
