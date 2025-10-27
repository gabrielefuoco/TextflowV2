import re
from typing import List, Dict, Tuple
from abc import ABC, abstractmethod
from collections import deque
from llama_index.core import Document
from llama_index.core.node_parser import SentenceSplitter as LlamaSentenceSplitter

class BaseTextSplitter(ABC):
    """Classe base astratta per gli splitter di testo."""
    def __init__(self, **kwargs):
        pass

    @abstractmethod
    def split(self, text: str) -> List[str]:
        """Divide il testo in una lista di stringhe."""
        pass

    def _word_count(self, text: str) -> int:
        """Conta il numero di parole in un testo."""
        return len(re.findall(r'\b\w+\b', text))

class HierarchicalSplitter(BaseTextSplitter):
    """
    Uno splitter avanzato che aggrega il testo in modo gerarchico.
    """
    def __init__(self,
                 max_words: int = 1000,
                 min_words: int = 300,
                 chunk_size: int = 1024,
                 chunk_overlap: int = 200):
        super().__init__()
        self.max_words = max_words
        self.min_words = min_words
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def _get_header_level(self, text: str) -> int:
        """Estrae il livello di un header Markdown (es. ## -> 2)."""
        match = re.match(r'^(#{1,6})\s', text)
        return len(match.group(1)) if match else float('inf')

    def _split_semantically(self, text: str, header: str) -> List[Tuple[int, str]]:
        """Divide semanticamente un blocco di testo, restituendo sotto-blocchi."""
        semantic_splitter = LlamaSentenceSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
        )
        nodes = semantic_splitter.get_nodes_from_documents([Document(text=text)])
        
        sub_blocks = []
        part_counter = 1
        for node in nodes:
            content = node.get_content().strip()
            if content:
                context_header = f"{header.strip()} - Parte {part_counter}"
                sub_blocks.append((self._get_header_level(header), f"{context_header}\n\n{content}"))
                part_counter += 1
        return sub_blocks

    def split(self, text: str) -> List[str]:
        if not text or not text.strip():
            return []

        # 1. Pre-divisione in blocchi atomici
        raw_splits = re.split(r'(?m)(?=^#{1,6}\s)', text)
        initial_blocks = deque()
        for split in raw_splits:
            if split.strip():
                level = self._get_header_level(split)
                initial_blocks.append((level, split.strip()))

        if not initial_blocks:
            return [text] if self._word_count(text) > 0 else []

        # 2. Aggregazione Gerarchica con logica di finalizzazione robusta
        temp_chunks = []
        current_chunk_content = ""
        current_chunk_level = float('inf')

        while initial_blocks:
            block_level, block_content = initial_blocks.popleft()

            # Gestione blocco gigante che deve essere diviso subito
            is_giant_block = self._word_count(block_content) > self.max_words
            if (not current_chunk_content and is_giant_block) or (current_chunk_content and is_giant_block):
                # Finalizza il chunk corrente prima di processare quello gigante
                if current_chunk_content:
                    temp_chunks.append(current_chunk_content)
                    current_chunk_content = ""
                
                header = block_content.split('\n')[0]
                content = '\n'.join(block_content.split('\n')[1:])
                sub_blocks = self._split_semantically(content, header)
                for sub_block in reversed(sub_blocks):
                    initial_blocks.appendleft(sub_block)
                continue

            potential_new_size = self._word_count(current_chunk_content + "\n\n" + block_content)

            # Se il nuovo blocco è gerarchicamente inferiore e ci sta, lo aggiungiamo
            if block_level > current_chunk_level and potential_new_size <= self.max_words:
                current_chunk_content += "\n\n" + block_content
            else:
                # Altrimenti, finalizziamo il chunk corrente e ne iniziamo uno nuovo
                if current_chunk_content:
                    temp_chunks.append(current_chunk_content)
                
                current_chunk_content = block_content
                current_chunk_level = block_level
        
        # Aggiungi l'ultimo chunk rimasto
        if current_chunk_content:
            temp_chunks.append(current_chunk_content)

        # 3. Passata finale di accorpamento per gestire i chunk troppo piccoli
        if not temp_chunks:
            return []

        final_chunks = []
        for chunk in temp_chunks:
            # Se è il primo chunk o se il chunk precedente è abbastanza grande, aggiungilo
            if not final_chunks or self._word_count(final_chunks[-1]) >= self.min_words:
                final_chunks.append(chunk)
            # Altrimenti, se il chunk precedente era troppo piccolo, unisci questo ad esso
            else:
                final_chunks[-1] += "\n\n" + chunk
                
        return final_chunks

def get_splitter(chunking_config: Dict) -> BaseTextSplitter:
    """
    Factory function che restituisce lo splitter gerarchico configurato.
    """
    return HierarchicalSplitter(
        max_words=chunking_config.get('max_words', 1000),
        min_words=chunking_config.get('min_words', 300),
        chunk_size=chunking_config.get('chunk_size', 1024),
        chunk_overlap=chunking_config.get('chunk_overlap', 200)
    )