import re
from typing import List

def rebalance_headers(text: str, reset_threshold: int = 40) -> str:
    """
    Analizza un testo Markdown e declassa gli header H1 troppo vicini tra loro
    per creare una gerarchia più logica. Questa funzione viene chiamata dopo
    la formattazione iniziale degli header.

    Args:
        text (str): Il testo Markdown di input, già parzialmente formattato.
        reset_threshold (int): Il numero di righe non-H1 necessarie per "dimenticare"
                               l'ultimo H1 visto e permetterne uno nuovo.

    Returns:
        str: Il testo con gli header ribilanciati.
    """
    if not text or not text.strip():
        return ""

    lines = text.split('\n')
    processed_lines = []
    h1_seen_recently = False
    lines_since_last_h1 = 0

    for line in lines:
        stripped_line = line.strip()

        # Logica di reset
        if lines_since_last_h1 > reset_threshold:
            h1_seen_recently = False

        # Analisi della riga
        is_h1 = stripped_line.startswith('# ') and not stripped_line.startswith('##')

        if is_h1:
            if h1_seen_recently:
                # Declassa a H2 aggiungendo un '#'
                processed_lines.append(f"#{line}")
            else:
                # Mantieni come H1 e aggiorna lo stato
                processed_lines.append(line)
                h1_seen_recently = True
                lines_since_last_h1 = 0
        else:
            # Riga normale, incrementa il contatore se necessario
            processed_lines.append(line)
            if h1_seen_recently:
                 lines_since_last_h1 += 1

    return "\n".join(processed_lines)

def normalize_text(text: str) -> str:
    """
    Funzione principale che orchestra il processo di normalizzazione in due fasi:
    1. Identifica e formatta gli header grezzi.
    2. Ribalancia la gerarchia degli header per una maggiore coerenza.
    """
    if not text or not text.strip():
        return ""

    # Fase 0: Pulizia preliminare
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)

    # Fase 1: Identificazione e formattazione degli header
    lines = text.split('\n')
    formatted_lines = []
    for line in lines:
        stripped_line = line.strip()
        if not stripped_line:
            formatted_lines.append("")
            continue

        word_count = len(stripped_line.split())
        
        # Heuristic for H1: ALL CAPS, short, not a sentence.
        is_all_caps = stripped_line.isupper() and stripped_line.lower() != stripped_line
        if is_all_caps and 1 <= word_count <= 10 and not stripped_line.endswith(('.', ':', ',')):
            formatted_lines.append(f"# {stripped_line}")
            continue

        # Heuristic for H2: Multi-level numbering like "1.1", "2.4."
        if re.match(r'^\d+(\.\d+)+\.?\s', stripped_line):
            formatted_lines.append(f"## {stripped_line}")
            continue

        formatted_lines.append(line)
    
    formatted_text = "\n".join(formatted_lines)

    # Fase 2: Ribilanciamento degli header appena creati
    rebalanced_text = rebalance_headers(formatted_text)
    
    return rebalanced_text