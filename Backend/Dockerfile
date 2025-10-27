# backend/Dockerfile

# Usa un'immagine Python ufficiale e snella.
FROM python:3.11-slim

# Imposta la directory di lavoro dentro il container.
WORKDIR /app

# Installa le dipendenze. Copiare solo requirements.txt prima sfrutta la cache di Docker.
COPY ./requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copia tutto il codice del backend.
COPY . /app/

# La porta su cui Uvicorn ascolterà.
EXPOSE 8000

# Il comando per avviare il server quando il container parte.
# NOTA: Sto assumendo che tu abbia un file api/main.py che non hai caricato.
# Se il tuo entrypoint è diverso, CAMBIALO QUI.
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]