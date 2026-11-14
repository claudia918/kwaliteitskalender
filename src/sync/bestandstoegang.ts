/**
 * Toegang tot het gedeelde kalenderbestand. Alles lokaal: File System Access API (Chrome/Edge),
 * IndexedDB om de koppeling te onthouden, en gewone download/upload voor andere browsers.
 * Er wordt nooit iets over het netwerk verstuurd.
 */
import { BESTAND_EXTENSIE } from '../domein/state';

const BESTANDSTYPES: FilePickerAcceptType[] = [{ description: 'Kwaliteitskalender', accept: { 'application/json': ['.json'] } }];

/** Kan deze browser een bestand blijvend koppelen (Chrome, Edge)? */
export function ondersteuntKoppelen(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showOpenFilePicker' in window &&
    'showSaveFilePicker' in window &&
    typeof indexedDB !== 'undefined'
  );
}

function isAfgebroken(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

/** Laat de gebruiker een bestaand kalenderbestand kiezen. null = geannuleerd. */
export async function kiesBestaandBestand(): Promise<FileSystemFileHandle | null> {
  try {
    const [handle] = await window.showOpenFilePicker({ types: BESTANDSTYPES, multiple: false, excludeAcceptAllOption: false });
    return handle ?? null;
  } catch (e) {
    if (isAfgebroken(e)) return null;
    throw e;
  }
}

/** Laat de gebruiker een nieuw kalenderbestand aanmaken. null = geannuleerd. */
export async function maakNieuwBestand(voorgesteldeNaam: string): Promise<FileSystemFileHandle | null> {
  try {
    return await window.showSaveFilePicker({ suggestedName: voorgesteldeNaam, types: BESTANDSTYPES });
  } catch (e) {
    if (isAfgebroken(e)) return null;
    throw e;
  }
}

export async function leesBestand(handle: FileSystemFileHandle): Promise<{ tekst: string; gewijzigd: number }> {
  const file = await handle.getFile();
  return { tekst: await file.text(), gewijzigd: file.lastModified };
}

export async function bestandGewijzigdOp(handle: FileSystemFileHandle): Promise<number> {
  return (await handle.getFile()).lastModified;
}

export async function schrijfBestand(handle: FileSystemFileHandle, tekst: string): Promise<void> {
  const w = await handle.createWritable({ keepExistingData: false });
  try {
    await w.write(tekst);
  } finally {
    await w.close();
  }
}

/**
 * Controleer (en vraag zo nodig) lees- en schrijftoestemming.
 * `vragen` alleen vanuit een klik van de gebruiker; anders weigert de browser.
 */
export async function heeftToestemming(handle: FileSystemFileHandle, vragen: boolean): Promise<boolean> {
  const opties: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' };
  try {
    if ((await handle.queryPermission(opties)) === 'granted') return true;
    if (!vragen) return false;
    return (await handle.requestPermission(opties)) === 'granted';
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Koppeling onthouden (IndexedDB)                                      */
/* ------------------------------------------------------------------ */

const DB_NAAM = 'kwaliteitskalender';
const STORE = 'koppeling';
const SLEUTEL = 'gedeeld-bestand';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAAM, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function metStore<T>(modus: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, modus);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function bewaarKoppeling(handle: FileSystemFileHandle): Promise<boolean> {
  try {
    await metStore('readwrite', (s) => s.put(handle, SLEUTEL));
    return true;
  } catch {
    return false;
  }
}

export async function laadKoppeling(): Promise<FileSystemFileHandle | null> {
  try {
    const h = await metStore<FileSystemFileHandle | undefined>('readonly', (s) => s.get(SLEUTEL));
    return h ?? null;
  } catch {
    return null;
  }
}

export async function vergeetKoppeling(): Promise<void> {
  try {
    await metStore('readwrite', (s) => s.delete(SLEUTEL));
  } catch {
    /* niets te vergeten */
  }
}

/* ------------------------------------------------------------------ */
/* Handmatig (alle browsers)                                            */
/* ------------------------------------------------------------------ */

/** Biedt tekst aan als download (blob-URL; geen netwerk). */
export function downloadTekst(bestandsnaam: string, tekst: string, mime = 'application/json'): void {
  const blob = new Blob([tekst], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = bestandsnaam;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Opent de bestandskiezer en geeft het gekozen bestand (null = geannuleerd). */
export function kiesBestandHandmatig(accept = `.json,${BESTAND_EXTENSIE},application/json`): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    let klaar = false;
    const afronden = (f: File | null) => {
      if (klaar) return;
      klaar = true;
      input.remove();
      resolve(f);
    };
    input.addEventListener('change', () => afronden(input.files?.[0] ?? null));
    input.addEventListener('cancel', () => afronden(null));
    document.body.appendChild(input);
    input.click();
  });
}
