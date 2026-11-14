/**
 * Excel-werkmap maken en aanbieden als download. SheetJS wordt dynamisch geladen; de
 * singlefile-build bundelt dat in het ene HTML-bestand (geen los chunk, geen netwerk).
 */
import type { Tabblad } from './rijen';

/** Biedt binaire inhoud aan als download (blob-URL; geen netwerk). */
export function downloadBlob(bestandsnaam: string, blob: Blob): void {
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

export async function downloadExcel(bestandsnaam: string, bladen: Tabblad[]): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  for (const blad of bladen) {
    const ws = XLSX.utils.json_to_sheet(blad.rijen, { header: blad.kolommen });
    ws['!cols'] = blad.breedtes.map((wch) => ({ wch }));
    const ref = ws['!ref'];
    if (ref && blad.rijen.length > 0) ws['!autofilter'] = { ref };
    XLSX.utils.book_append_sheet(wb, ws, blad.naam);
  }
  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true }) as ArrayBuffer;
  downloadBlob(
    bestandsnaam,
    new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  );
}
