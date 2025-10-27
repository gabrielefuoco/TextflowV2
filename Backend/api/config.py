# api/config.py
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Carica e valida la configurazione dell'applicazione da variabili d'ambiente.
    """
    # Le chiavi API sono la cosa più importante. Se mancano, l'app non deve partire.
    google_api_key: str = Field(..., env="GOOGLE_API_KEY")
    mistral_api_key: str = Field(..., env="MISTRAL_API_KEY")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra='ignore'
    )

# Crea un'istanza singola della configurazione che verrà usata in tutta l'app
settings = Settings()
