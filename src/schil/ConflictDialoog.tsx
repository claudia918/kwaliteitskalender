import { Button, Dialog } from '../componenten';
import { useSync } from '../sync/SyncProvider';

/** Meldt welke onderdelen jij en een collega tegelijk wijzigden (de nieuwste is bewaard). */
export function ConflictDialoog() {
  const { conflicten, sluitConflicten } = useSync();
  const open = conflicten.length > 0;
  // dubbele meldingen samenvoegen
  const uniek = [...new Map(conflicten.map((c) => [c.sleutel, c])).values()];
  return (
    <Dialog
      open={open}
      onClose={sluitConflicten}
      title="Tegelijk gewijzigd door jou en een collega"
      subtitle="Per onderdeel is de nieuwste wijziging bewaard."
      footer={
        <Button variant="primary" onClick={sluitConflicten}>
          Begrepen
        </Button>
      }
    >
      <p className="text-sm text-ink-body">
        Sinds de vorige synchronisatie zijn deze onderdelen zowel hier als door een collega gewijzigd. Controleer of het resultaat
        klopt.
      </p>
      <ul className="mt-4 divide-y divide-line-subtle rounded-md border border-line-subtle">
        {uniek.map((c) => (
          <li key={c.sleutel} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
            <span className="min-w-0 font-medium text-ink-strong">{c.omschrijving}</span>
            <span className="shrink-0 text-xs text-ink-muted">
              {c.bewaard === 'lokaal' ? 'jouw versie bewaard' : 'versie van collega bewaard'}
            </span>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
