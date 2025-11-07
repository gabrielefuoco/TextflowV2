import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Card } from './Card';
import { PromptIcon, TrashIcon, EyeIcon } from './icons';
import { Modal } from './Modal';

const cleaner = `
# **Obiettivo:** Eseguire un processo accurato di pulizia e formattazione del testo fornito, garantendo coerenza, leggibilità e integrità del contenuto originale. 
Non è consentito interpretare, modificare o aggiungere informazioni. L’esecuzione deve limitarsi alle istruzioni seguenti.

---

## Direttive di Sanitizzazione

1. **Rimozione di artefatti OCR:** Eliminare ogni riferimento a intestazioni o piè di pagina (es. “Pagina X di Y”), numeri di riga, marcatori di scansione e caratteri estranei.

2. **Ricongiungimento di parole spezzate:** Identificare e correggere parole divise da un a-capo forzato (es. \`elabora-\\nzione\` → \`elaborazione\`).

3. **Mantenimento dell’integrità semantica:** Non riassumere, parafrasare, correggere o modificare il significato del testo. 
   Eventuali errori grammaticali o sintattici vanno mantenuti se il testo è comprensibile.

4. **Divieto di aggiunta di contenuti:** Non introdurre, dedurre o ipotizzare informazioni non presenti nel testo originale.

---

## Protocolli di Formattazione e Normalizzazione

1. **Strutturazione Markdown:** - Identificare titoli e sottotitoli impliciti e applicare la sintassi corretta: 
     \`#\` per H1, \`##\` per H2, \`###\` per H3, ecc. 
   - Mantenere una gerarchia coerente. 
   - Conservare eventuale sintassi Markdown già presente, correggendo solo errori evidenti.

2. **Normalizzazione dello spazio bianco:** - Ridurre spazi multipli a uno singolo. 
   - Eliminare spazi all’inizio e alla fine delle righe. 
   - Ridurre a-capi multipli a un singolo a-capo vuoto per separare i paragrafi.

3. **Formattazione delle formule LaTeX:** - Identificare formule matematiche o scientifiche. 
   - Se prive di delimitatori, incapsularle correttamente: 
     - Inline → \`$...$\` 
     - Blocco → \`$$...$$\`

4. **Escaping dei caratteri speciali Markdown:** - Anteporre \`\\\` ai caratteri \`<\`, \`>\`, \`#\`, \`*\`, \`_\` quando non sono utilizzati per la formattazione.

---

## Output

Restituire esclusivamente il testo pulito e formattato, senza commenti, spiegazioni o contenuti aggiuntivi.

---

## Testo da processare:

{text_chunk}
`;

const formatta = `
**Persona e Obiettivo:**
Agisci come un assistente AI esperto nella formattazione di documenti tecnici e accademici. Il tuo obiettivo è prendere un testo fornito dall'utente e riformattarlo in Markdown, seguendo in modo pedissequo e rigoroso un insieme di regole imperative. Il risultato finale deve essere una versione pulita, organizzata e accurata degli appunti originali, pronta per lo studio.

**Compito Principale:**
Formatta il testo fornito in input applicando dettagliatamente e senza eccezioni le seguenti istruzioni.

**Istruzioni Dettagliate di Formattazione:**
##### **1. Regole Generali**
- **Organizzazione e Formato:** Utilizza il formato Markdown per organizzare il testo in paragrafi chiari e schematizzati. Assicurati che tutti i concetti rilevanti siano coperti senza aggiungere contenuti superflui.
- **Integrità del Contenuto:** Mantieni l'integrità del contenuto originale. Non tralasciare alcun punto o informazione.
- **Correzione di Errori:** Correggi esclusivamente **errori di battitura e grammaticali oggettivi**. Se una sezione è concettualmente ambigua o poco chiara, lasciala così com'è.
- **Formule e Codice:** Mantieni intatti tutti i blocchi di formule e codice, incluse eventuali spiegazioni associate.
- **Immagini:** Non rimuovere i tag immagine. Lascia i tag nella forma \`![[]]\` come si trovano nel testo originale.
- **Sintesi Conclusiva:** Non includere una sezione di sintesi o un riepilogo alla fine. Il testo formattato deve essere autosufficiente.
##### **2. Blocchi Speciali (Callouts) - Regole di Applicazione Strette**
Applica i callout solo quando il testo corrisponde **esattamente** a una delle seguenti categorie:
- **Usa \`>[!NOTE]\` esclusivamente per:**
- Note esplicative, commenti o approfondimenti **esterni** al flusso principale del testo. Non usarlo per definizioni, formule o concetti chiave.
**Esempio di Riferimento:** _Input:_
\`\`\`
**IDEA**: Suddividere il grafo in diverse partizioni.
- Applichiamo ricorsivamente il taglio minimo.
- Dobbiamo rivedere la definizione di taglio.
\`\`\`
_Output Atteso:_
\`\`\`
>[!NOTE] IDEA
>Suddividere il grafo in diverse partizioni.
>- Applichiamo ricorsivamente il taglio minimo.
>- Dobbiamo rivedere la definizione di taglio.
\`\`\`
- **Usa \`>[!DANGER]\` esclusivamente per:**
- Descrizioni di problemi, criticità, limitazioni, svantaggi o avvertimenti.
- **Usa \`>[!ABSTRACT]\` per Algoritmi e Pseudocodice, seguendo questa procedura imperativa:**
- Se il testo è un algoritmo o uno pseudocodice (identificato dal titolo "Algoritmo:", "Pseudocodice:", o da una struttura con \`Input/Output\`), **DEVI** formattarlo secondo le seguenti regole:
1. La prima riga (il nome dell'algoritmo) **DEVE** essere racchiusa in un callout singolo: \`> [!abstract]\`.
2. **TUTTE** le righe dell'algoritmo, inclusa la prima, devono iniziare con il carattere \`>\`.
3. L'indentazione dei passaggi annidati **DEVE** essere rappresentata usando \`\\quad\`, \`\\quad\\quad\`, \`\\quad\\quad\\quad\`, etc., all'interno dell'ambiente matematico.
4. Ogni riga di testo dell'algoritmo **DEVE** essere trattata come una formula inline, quindi racchiusa interamente in \`$ ... $\`.
5. Le parole chiave descrittive ("se", "per", "a", "scambia", "restituisci", etc.) **DEVONO** essere racchiuse in \`\\text{...}\`.
6. Tutte le variabili e i simboli matematici devono seguire la sintassi LaTeX.
- **Esempio di Riferimento Obbligatorio (QuickSort):**
*Input:*
\`\`\`
Algoritmo: QuickSort(A, p, r)
se p < r
q = Partition(A, p, r)
QuickSort(A, p, q - 1)
QuickSort(A, q + 1, r)
Partition(A, p, r)
x = A[r]
i = p - 1
per j = p a r - 1
se A[j] <= x
i = i + 1
scambia A[i] con A[j]
scambia A[i + 1] con A[r]
restituisci i + 1
\`\`\`

*Output Atteso*:

> [!abstract] $\\text{QuickSort}(A, p, r)$
> $\\quad \\text{se}$ $p < r$
> $\\quad\\quad q = \\text{Partition}(A, p, r)$
> $\\quad\\quad \\text{QuickSort}(A, p, q - 1)$
> $\\quad\\quad \\text{QuickSort}(A, q + 1, r)$
>
> $\\text{Partition}(A, p, r)$
> $\\quad x = A[r]$
> $\\quad i = p - 1$
> $\\quad \\text{per}$ $j = p$ $\\text{a}$ $r - 1$
> $\\quad\\quad \\text{se}$ $A[j] \\leq x$
> $\\quad\\quad\\quad i = i + 1$
> $\\quad\\quad\\quad \\text{scambia}$ $A[i]$ $\\text{con}$ $A[j]$
> $\\quad \\text{scambia}$ $A[i + 1]$ $\\text{con}$ $A[r]$
> $\\quad \\text{restituisci}$ $i + 1$
##### Testo da formattare:
{text_chunk}
`;


const DEFAULT_PROMPTS: Record<string, string> = {
  'Summarize': 'Based on the following text, extract the key concepts and provide a detailed technical summary in markdown format.\n\nText to analyze:\n---\n{text_chunk}\n---',
  'Key Points': 'Extract the main key points from the following text as a bulleted list in markdown.\n\nText:\n---\n{text_chunk}\n---',
  'Sentiment Analysis': 'Analyze the sentiment of the following text. Is it positive, negative, or neutral? Explain your reasoning.\n\nText:\n---\n{text_chunk}\n---',
  'Cleaner': cleaner,
  'Formatta': formatta
};

export const PromptSelector = () => {
  const { 
    selectedPrompts, 
    addSelectedPrompt, 
    removeSelectedPrompt, 
    customPromptName, 
    setCustomPromptName, 
    customPromptContent, 
    setCustomPromptContent,
    preprocessingOnly
  } = useAppStore();

  const [viewingPrompt, setViewingPrompt] = useState<{ name: string; content: string } | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleDefaultPromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    if (checked) {
      addSelectedPrompt(name, DEFAULT_PROMPTS[name]);
    } else {
      removeSelectedPrompt(name);
    }
  };
  
  const handleAddCustomPrompt = () => {
      if (customPromptName && customPromptContent && !selectedPrompts[customPromptName]) {
          addSelectedPrompt(customPromptName, customPromptContent);
          setCustomPromptName('');
          setCustomPromptContent('');
      }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  const selectedDefaultPrompts = Object.keys(selectedPrompts).filter(p => DEFAULT_PROMPTS[p]);

  return (
    <>
      <Card title="Select & Create Prompts" icon={<PromptIcon />}>
        <fieldset
          disabled={preprocessingOnly}
          className={`space-y-6 transition-opacity ${preprocessingOnly ? 'opacity-50' : ''}`}
        >
          <div>
            <h3 className="font-semibold text-slate-700 mb-2">Default Prompts</h3>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="relative w-full cursor-default rounded-md bg-white py-2 pl-3 pr-10 text-left text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 sm:text-sm sm:leading-6"
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
              >
                <span className="block truncate">
                  {selectedDefaultPrompts.length > 0 ? selectedDefaultPrompts.join(', ') : 'Select prompts...'}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <svg className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 3a.75.75 0 01.53.22l3.5 3.5a.75.75 0 01-1.06 1.06L10 4.81 6.53 8.28a.75.75 0 01-1.06-1.06l3.5-3.5A.75.75 0 0110 3zm-3.72 9.53a.75.75 0 011.06 0L10 15.19l2.47-2.47a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 010-1.06z" clipRule="evenodd" />
                  </svg>
                </span>
              </button>
              
              {isDropdownOpen && (
                <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm" role="listbox">
                  {Object.entries(DEFAULT_PROMPTS).map(([name, content]) => (
                    <li key={name} className="flex items-center justify-between text-slate-900 relative select-none py-2 pl-3 pr-3 hover:bg-slate-100" role="option" aria-selected={!!selectedPrompts[name]}>
                      <label className="flex items-center space-x-3 cursor-pointer grow">
                        <input
                          type="checkbox"
                          name={name}
                          checked={!!selectedPrompts[name]}
                          onChange={handleDefaultPromptChange}
                          className="h-4 w-4 rounded border-slate-300 bg-white text-brand-600 focus:ring-brand-500"
                        />
                        <span className="font-normal block truncate">{name}</span>
                      </label>
                      <button 
                        onClick={() => setViewingPrompt({ name, content })} 
                        className="text-slate-500 hover:text-brand-600 p-1 rounded-full flex-shrink-0"
                        aria-label={`View prompt: ${name}`}
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-3 border-t pt-4">Custom Prompt</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Custom prompt name..."
                value={customPromptName}
                onChange={(e) => setCustomPromptName(e.target.value)}
                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
              />
              <textarea
                placeholder="Your custom prompt content. Use {text_chunk} as a placeholder for the document text..."
                value={customPromptContent}
                onChange={(e) => setCustomPromptContent(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
              />
              <button
                  onClick={handleAddCustomPrompt}
                  disabled={!customPromptName || !customPromptContent || !!selectedPrompts[customPromptName]}
                  className="px-4 py-2 bg-brand-600 text-white font-semibold rounded-md shadow-sm hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                Add Custom Prompt
              </button>
            </div>
          </div>

          {Object.keys(selectedPrompts).length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-slate-700 mb-2">Active Prompts</h3>
              <div className="flex flex-wrap gap-2">
                  {Object.entries(selectedPrompts).map(([name, content]) => (
                      <div key={name} className="flex items-center bg-brand-100 text-brand-800 text-sm font-medium pl-3 pr-2 py-1 rounded-full">
                          <span>{name}</span>
                          <div className="flex items-center ml-2 space-x-1">
                              <button 
                                onClick={() => setViewingPrompt({ name, content })} 
                                className="text-brand-600 hover:text-brand-800 p-1 rounded-full"
                                aria-label={`View prompt: ${name}`}
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => removeSelectedPrompt(name)} 
                                className="text-brand-600 hover:text-brand-800 p-1 rounded-full"
                                aria-label={`Remove prompt: ${name}`}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
            </div>
          )}
        </fieldset>
      </Card>
      <Modal
        isOpen={!!viewingPrompt}
        onClose={() => setViewingPrompt(null)}
        title={`Prompt: ${viewingPrompt?.name || ''}`}
      >
        <pre className="bg-slate-100 p-4 rounded-md text-sm text-slate-800 whitespace-pre-wrap font-sans">
          {viewingPrompt?.content}
        </pre>
      </Modal>
    </>
  );
};