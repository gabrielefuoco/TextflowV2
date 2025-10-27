import streamlit as st
from streamlit_app.file_manager import load_prompts
from streamlit_app.processing_engine import start_processing

# Import necessari
from src.chunking_strategy import get_splitter
from src.ocr_handler import process_pdf_to_markdown
from src.text_normalizer import normalize_text

def sync_chunks_from_widgets():
    """Sincronizza i chunk dallo stato dei widget prima di qualsiasi operazione."""
    if 'preview_chunks' in st.session_state:
        for i in range(len(st.session_state.preview_chunks)):
            widget_key = f"chunk_editor_{i}"
            if widget_key in st.session_state:
                st.session_state.preview_chunks[i] = st.session_state[widget_key]

def render_main_ui():
    st.title("🚀 TextFlow V2 - Pipeline di Elaborazione Documenti")
    st.markdown("---")

    if 'normalize_text' not in st.session_state:
        st.session_state.normalize_text = True

    st.warning("ATTENZIONE ALLA MEMORIA: L'applicazione processa i file in RAM.")

    tab1, tab2, tab3, tab4 = st.tabs([
        "📄 **Fase 1: Carica Documenti**", "🎯 **Fase 2: Seleziona Prompt**",
        "⚙️ **Fase 3: Esegui**", "✍️ **Fase 4: Editor Chunk Interattivo**"
    ])

    with tab1: render_file_upload_page()
    with tab2: render_prompt_selection_page()
    with tab3: render_config_and_run_page()
    with tab4: render_chunk_preview_page()

def render_file_upload_page():
    st.header("Carica i Documenti da Processare")
    uploaded_files = st.file_uploader(
        "Trascina qui i tuoi file .md, .txt, o .pdf",
        type=['md', 'txt', 'pdf'], accept_multiple_files=True, key="file_uploader"
    )
    if uploaded_files:
        st.session_state.uploaded_files = uploaded_files
        if 'chunks_loaded' in st.session_state and st.session_state.chunks_loaded:
            del st.session_state.chunks_loaded
            st.toast("Nuovi file caricati. Resetto l'editor dei chunk.")
            
    if 'uploaded_files' in st.session_state and st.session_state.uploaded_files:
        st.success(f"**{len(st.session_state.uploaded_files)} file caricati e pronti.**")
        with st.expander("File in Coda"):
            for f in st.session_state.uploaded_files:
                st.write(f"📄 {f.name} ({round(f.size/1024, 2)} KB)")

def render_prompt_selection_page():
    st.header("Seleziona i Prompt da Applicare")
    prompt_folder = st.session_state.get('prompt_folder')
    st.session_state.available_prompts = load_prompts(prompt_folder)
    selected_prompts = {}
    st.subheader("Seleziona da Prompt Esistenti")
    if not st.session_state.available_prompts:
        st.warning(f"Nessun prompt trovato nella cartella: `{prompt_folder}`.")
    for name, content in st.session_state.available_prompts.items():
        if st.checkbox(f"🎯 {name}", key=f"prompt_{name}"):
            selected_prompts[name] = content
    st.subheader("... o Aggiungi un Prompt Temporaneo")
    new_prompt_name = st.text_input("Nome del prompt", key="new_prompt_name")
    new_prompt_content = st.text_area("Contenuto (usa {text_chunk})", height=150, key="new_prompt_content")
    if new_prompt_name and new_prompt_content and new_prompt_name not in selected_prompts:
        selected_prompts[new_prompt_name] = new_prompt_content
    st.session_state.selected_prompts = selected_prompts
    st.success(f"**{len(st.session_state.selected_prompts)} prompt selezionati.**")

def render_config_and_run_page():
    st.header("Configura i Parametri e Avvia la Pipeline")
    with st.container(border=True):
        st.subheader("✨ Pre-processing")
        st.toggle("Normalizza testo (consigliato per OCR)", key='normalize_text')
        st.divider()
        st.subheader("🤖 Configurazione Modello LLM")
        model_cfg = st.session_state.get('model_config', {})
        model_name = st.selectbox("Modello Gemini", ["models/gemini-pro", "models/gemini-flash-lite-latest"], index=1, key='model_name')
        temperature = st.slider("Temperatura", 0.0, 1.0, model_cfg.get('temperature', 0.7), 0.05, key='temperature')
        st.session_state.model_config = {'model_name': model_name, 'temperature': temperature}
        st.subheader("🔪 Configurazione Chunking (Avanzato)")
        chunk_cfg = st.session_state.get('chunking_config', {})
        max_words = st.number_input("Max parole/sezione", 300, 8000, chunk_cfg.get('max_words', 1000), 50)
        min_words = st.number_input("Min parole/sezione", 50, 1000, chunk_cfg.get('min_words', 300), 50)
        st.session_state.chunking_config = {'max_words': max_words, 'min_words': min_words}
        st.subheader("📜 Configurazione Output")
        order_mode = st.selectbox("Ordinamento Output", ["chunk", "prompt"], key='order_mode')
    
    st.markdown("---")
    if st.session_state.get('uploaded_files'):
        if st.button("🚀 AVVIA PIPELINE", use_container_width=True, type="primary"):
            precomputed_chunks = None
            if st.session_state.get('chunks_loaded'):
                sync_chunks_from_widgets()
                edited_filename = st.session_state.get('preview_file_name')
                if edited_filename:
                    precomputed_chunks = {edited_filename: st.session_state.preview_chunks}
                    st.toast(f"✅ Avvio pipeline con i chunk modificati per {edited_filename}!")
            start_processing(precomputed_chunks=precomputed_chunks)
    else:
        st.error("Carica almeno un file per procedere.")

def render_chunk_preview_page():
    st.header("Editor Interattivo dei Chunk")
    
    # CHIAVE: Sincronizza SEMPRE all'inizio del rendering
    if st.session_state.get('chunks_loaded'):
        sync_chunks_from_widgets()
    
    st.info("💡 **Suggerimento**: Le modifiche vengono salvate automaticamente. Usa i bottoni sotto ogni chunk per unirli.")

    if not st.session_state.get('uploaded_files', []):
        st.warning("Carica almeno un file nella **Fase 1** per usare l'editor.")
        return

    # Inizializza pending_merge se non esiste
    if 'pending_merge' not in st.session_state:
        st.session_state.pending_merge = None

    file_map = {f.name: f for f in st.session_state.uploaded_files}
    selected_filename = st.selectbox("Seleziona un file da analizzare", options=list(file_map.keys()), key="preview_file_name")
    should_normalize = st.toggle("Applica normalizzazione", value=True, key="preview_normalize")
    
    col1, col2, col3 = st.columns(3)
    
    if col1.button("🔍 Analizza e Carica", use_container_width=True, type="primary", disabled=st.session_state.get('chunks_loaded', False)):
        with st.spinner(f"Processo '{selected_filename}'..."):
            file = file_map[selected_filename]
            is_pdf = file.name.lower().endswith('.pdf')
            content = process_pdf_to_markdown(file.getvalue(), file.name, {}) if is_pdf else file.getvalue().decode("utf-8")
            content_to_split = normalize_text(content) if should_normalize else content
            splitter = get_splitter(st.session_state.get('chunking_config', {}))
            st.session_state.preview_chunks = splitter.split(content_to_split)
            st.session_state.chunks_loaded = True
            st.session_state.pending_merge = None
            st.rerun()
    
    if col2.button("💾 Salva Modifiche", use_container_width=True, disabled=not st.session_state.get('chunks_loaded', False)):
        sync_chunks_from_widgets()
        st.toast("✅ Modifiche salvate correttamente!")
        
    if col3.button("↩️ Ricomincia", use_container_width=True, disabled=not st.session_state.get('chunks_loaded', False)):
        # Pulizia completa dello stato
        for key in list(st.session_state.keys()):
            if key.startswith('chunk_editor_'):
                del st.session_state[key]
        if 'chunks_loaded' in st.session_state: 
            del st.session_state.chunks_loaded
        if 'preview_chunks' in st.session_state: 
            del st.session_state.preview_chunks
        if 'pending_merge' in st.session_state:
            del st.session_state.pending_merge
        st.toast("Editor resettato.")
        st.rerun()

    if not st.session_state.get('chunks_loaded'):
        return

    # Gestisci pending merge PRIMA del rendering
    if st.session_state.pending_merge is not None:
        i = st.session_state.pending_merge
        if i < len(st.session_state.preview_chunks) - 1:
            # Unisci i chunk
            chunk1 = st.session_state.preview_chunks[i]
            chunk2 = st.session_state.preview_chunks[i + 1]
            merged = chunk1 + "\n\n---\n\n" + chunk2
            st.session_state.preview_chunks[i] = merged
            st.session_state.preview_chunks.pop(i + 1)
            
            # Pulisci i vecchi widget
            for key in list(st.session_state.keys()):
                if key.startswith('chunk_editor_'):
                    del st.session_state[key]
            
            st.session_state.pending_merge = None
            st.toast(f"✅ Chunk {i+1} e {i+2} uniti con successo!")
            st.rerun()

    st.success(f"**{len(st.session_state.preview_chunks)} chunk disponibili**")
    
    # Anteprima completa in un expander sempre visibile
    with st.expander("📄 Visualizza Documento Completo Ricostruito"):
        sync_chunks_from_widgets()
        full_text = "\n\n--- SEPARATORE CHUNK ---\n\n".join(st.session_state.preview_chunks)
        st.text_area(
            "Anteprima completa (read-only)", 
            full_text, 
            height=400, 
            disabled=True,
            key="full_preview_readonly"
        )
        st.download_button(
            "💾 Scarica Documento Completo",
            full_text,
            file_name=f"{selected_filename}_ricostruito.txt",
            mime="text/plain"
        )

    st.markdown("---")
    st.subheader("📝 Editor dei Chunk")

    # Renderizza i chunk con UX migliorata
    for i, chunk in enumerate(st.session_state.preview_chunks):
        with st.container(border=True):
            splitter = get_splitter({}) 
            word_count = splitter._word_count(chunk)
            
            col_header1, col_header2 = st.columns([3, 1])
            with col_header1:
                st.markdown(f"### Chunk {i+1} di {len(st.session_state.preview_chunks)}")
            with col_header2:
                st.metric("Parole", word_count)
            
            # Text area senza on_change per evitare rerun
            st.text_area(
                "Contenuto",
                value=chunk,
                height=250,
                key=f"chunk_editor_{i}",
                label_visibility="collapsed"
            )
            
            # Bottone di unione solo se non è l'ultimo chunk
            if i < len(st.session_state.preview_chunks) - 1:
                col_btn1, col_btn2, col_btn3 = st.columns([1, 2, 1])
                with col_btn2:
                    if st.button(
                        f"⬇️ Unisci con Chunk {i+2}", 
                        key=f"merge_btn_{i}", 
                        use_container_width=True,
                        type="secondary"
                    ):
                        # Salva prima l'unione pendente
                        sync_chunks_from_widgets()
                        st.session_state.pending_merge = i
                        st.rerun()

def render_sidebar():
    with st.sidebar:
        st.header("📂 Configurazione Prompt")
        st.text_input("Cartella Prompt", key='prompt_folder', value=st.session_state.get('prompt_folder', 'prompts'))
        st.divider()
        if st.button("Ricarica Prompt"):
            st.rerun()