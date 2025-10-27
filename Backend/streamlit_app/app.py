import streamlit as st
import sys
import os

# Aggiungi la root del progetto al sys.path
# Questo risolve i problemi di import relativi quando si esegue l'app da questa sottodirectory
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from streamlit_app.config import initialize_session_state, validate_api_keys
from streamlit_app.ui_components import render_main_ui, render_sidebar

# ESEGUI QUESTO CHECK SUBITO
valid_keys, missing = validate_api_keys()
if not valid_keys:
    st.error(f"ERRORE DI CONFIGURAZIONE: Chiavi API mancanti nel file .env: {', '.join(missing)}")
    st.stop()

st.set_page_config(page_title="TextFlow V2", layout="wide", page_icon="🚀")

def main():
    initialize_session_state()
    render_sidebar()
    render_main_ui()

if __name__ == "__main__":
    main()
