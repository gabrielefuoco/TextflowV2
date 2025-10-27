import streamlit as st
import json
import os
from dotenv import load_dotenv

CONFIG_FILE = 'config.json'

def validate_api_keys():
    """Verifica la presenza delle API key necessarie nell'ambiente."""
    load_dotenv()
    missing = []
    if not os.getenv("GOOGLE_API_KEY"):
        missing.append("GOOGLE_API_KEY")
    if not os.getenv("MISTRAL_API_KEY"):
        missing.append("MISTRAL_API_KEY")
    if missing:
        return False, missing
    return True, []

def load_config() -> dict:
    try:
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"prompt_folder": "prompts", "model_config": {}, "chunking_config": {}, "ocr_config": {}}

def initialize_session_state():
    if 'initialized' in st.session_state:
        return
    config = load_config()
    st.session_state.prompt_folder = config.get('prompt_folder', 'prompts')
    st.session_state.model_config = config.get('model_config', {})
    st.session_state.chunking_config = config.get('chunking_config', {})
    st.session_state.ocr_config = config.get('ocr_config', {})
    st.session_state.uploaded_files = []
    st.session_state.selected_prompts = {}
    st.session_state.available_prompts = {}
    st.session_state.initialized = True
