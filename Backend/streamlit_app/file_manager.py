from pathlib import Path
from typing import Dict

def load_prompts(folder_path: str) -> Dict[str, str]:
    """Carica i prompt da una cartella e restituisce un dizionario {nome: contenuto}."""
    prompts = {}
    folder = Path(folder_path)
    if not folder.is_dir():
        return prompts
    for file_path in folder.glob("*.txt"):
        if not file_path.name.startswith('.'):
            try:
                prompts[file_path.name] = file_path.read_text(encoding='utf-8')
            except Exception as e:
                print(f"Errore nella lettura del prompt {file_path.name}: {e}")
    return prompts
