import streamlit as st
import zipfile
from io import BytesIO
from typing import Dict, List, Optional
from pathlib import Path
from collections import defaultdict
from src.text_processor import process_single_file, process_chunks
from src.ocr_handler import process_pdf_to_markdown
from src.text_normalizer import normalize_text

def start_processing(precomputed_chunks: Optional[Dict[str, List[str]]] = None):
    files_to_process: List[st.runtime.uploaded_file_manager.UploadedFile] = st.session_state.get('uploaded_files', [])
    prompts = st.session_state.get('selected_prompts', {})
    model_config = st.session_state.get('model_config', {})
    chunking_config = st.session_state.get('chunking_config', {})
    order_mode = st.session_state.get('order_mode', 'chunk')
    ocr_config = st.session_state.get('ocr_config', {})
    should_normalize = st.session_state.get('normalize_text', False)

    if not files_to_process:
        st.error("ERRORE: Nessun file caricato.")
        return

    progress_bar = st.progress(0, text="Inizializzazione...")
    log_area = st.empty()
    logs = ["Avvio della pipeline..."]

    processed_outputs: Dict[str, bytes] = {}
    total_files = len(files_to_process)
    filename_counter = defaultdict(int)

    for i, uploaded_file in enumerate(files_to_process):
        progress_text = f"File {i+1}/{total_files}: {uploaded_file.name}"
        progress_bar.progress(i / total_files, text=progress_text)
        
        try:
            # Controlla se per questo file abbiamo dei chunk pre-calcolati dall'editor
            if precomputed_chunks and uploaded_file.name in precomputed_chunks:
                logs.append(f"🧠 Utilizzo i chunk modificati dall'editor per: {uploaded_file.name}...")
                log_area.info("\n".join(logs))
                
                chunks = precomputed_chunks[uploaded_file.name]
                output_filename, output_content = process_chunks(
                    chunks=chunks, file_name=uploaded_file.name, prompts=prompts,
                    model_config=model_config, order_mode=order_mode
                )
                logs.append(f"✅ Elaborazione LLM completata (con chunk manuali) per: {uploaded_file.name}")

            else: # Flusso di lavoro standard
                is_pdf = uploaded_file.name.lower().endswith('.pdf')
                if is_pdf:
                    logs.append(f"🔬 Eseguo OCR su: {uploaded_file.name}...")
                    log_area.info("\n".join(logs))
                    pdf_bytes = uploaded_file.getvalue()
                    file_content_str = process_pdf_to_markdown(pdf_bytes, uploaded_file.name, ocr_config)
                    if file_content_str.strip().startswith("## ERRORE OCR"): raise Exception(file_content_str)
                    logs.append(f"✅ OCR completato per: {uploaded_file.name}")
                else:
                    file_content_str = uploaded_file.getvalue().decode("utf-8")
                    logs.append(f"➡️  Letto file di testo: {uploaded_file.name}")
                
                if should_normalize:
                    logs.append(f"⚙️  Normalizzazione testo per: {uploaded_file.name}...")
                    file_content_str = normalize_text(file_content_str)
                
                if prompts:
                    logs.append(f"🧠 Elaborazione LLM per: {uploaded_file.name}...")
                    log_area.info("\n".join(logs))
                    output_filename, output_content = process_single_file(
                        file_content=file_content_str, file_name=uploaded_file.name,
                        prompts=prompts, chunking_config=chunking_config,
                        model_config=model_config, order_mode=order_mode
                    )
                    logs.append(f"✅ Elaborazione LLM completata per: {uploaded_file.name}")
                else:
                    output_filename = f"{Path(uploaded_file.name).stem}.md"
                    output_content = file_content_str
                    logs.append(f"➡️ Nessun prompt. Salvataggio output per: {uploaded_file.name}")

            # Gestione nomi file duplicati
            original_filename = output_filename
            filename_counter[original_filename] += 1
            if filename_counter[original_filename] > 1:
                stem, suffix = Path(original_filename).stem, Path(original_filename).suffix
                output_filename = f"{stem}_{filename_counter[original_filename]-1}{suffix}"
            
            processed_outputs[output_filename] = output_content.encode('utf-8')

        except Exception as e:
            error_filename = f"{Path(uploaded_file.name).stem}-ERROR.md"
            error_content = f"# ERRORE DI ELABORAZIONE\n\nFile: {uploaded_file.name}\n\n```\n{str(e)}\n```"
            processed_outputs[error_filename] = error_content.encode('utf-8')
            logs.append(f"❌ ERRORE su {uploaded_file.name}: {str(e)}")
            log_area.error("\n".join(logs))
            continue

    progress_bar.progress(1.0, text="Pipeline completata!")
    logs.append("\n🎉 **Processo terminato!**")
    log_area.success("\n".join(logs))

    if processed_outputs:
        if len(processed_outputs) == 1:
            file_name, file_bytes = list(processed_outputs.items())[0]
            st.download_button(label=f"💾 Scarica {file_name}", data=file_bytes, file_name=file_name, mime="text/markdown", use_container_width=True)
        else:
            zip_buffer = BytesIO()
            with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
                for file_name, file_bytes in processed_outputs.items():
                    zf.writestr(file_name, file_bytes)
            st.download_button(label="📦 Scarica tutti i risultati come ZIP", data=zip_buffer.getvalue(), file_name="processed_documents.zip", mime="application/zip", use_container_width=True)