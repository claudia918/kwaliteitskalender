/**
 * Printweergave "Gespreksdossier" (inventaris §5.3, "e_"): voorbereiding van één gesprek voor
 * één kalender (school of bestuur), A4 staand. Alleen zichtbaar bij printen.
 */
import {
  GESPREKKEN_INHOUD,
  activiteitVan,
  afwijkingen,
  deadlineVanGesprek,
  effectieveNaam,
  formatDatumKort,
  formatDatumLang,
  itemsVanSchool,
  itemsVoorGesprek,
  ontbrekendeVasteStandaarden,
  sorteerOpNaam,
  standaardenVoor,
  startjaar,
  vindGesprek,
  vindSchool,
  voortgang,
  type EditScope,
  type State,
} from '../../domein';
import { PRINT_CSS, STATUS_PRINT_KLEUR } from './printstijl';
import { statusLabel } from './rijen';

/** Gegevens van het dossier; ook gebruikt voor de samenvatting op het scherm. */
export function dossierGegevens(state: State, doel: EditScope, gesprekId: string) {
  const org = state.organisatie;
  const isBestuur = doel.kind === 'bestuur';
  const alleItems = isBestuur ? state.bestuurItems : itemsVanSchool(state, doel.schoolId);
  const gesprek = vindGesprek(org.gesprekscyclus, gesprekId);
  const items = sorteerOpNaam(itemsVoorGesprek(alleItems, gesprekId));
  return {
    isBestuur,
    gesprek,
    inhoud: GESPREKKEN_INHOUD.find((g) => g.key === gesprekId),
    items,
    v: voortgang(items),
    afw: afwijkingen(items),
    signalen: ontbrekendeVasteStandaarden(alleItems, standaardenVoor(isBestuur)),
    deadline: deadlineVanGesprek(gesprek, startjaar(state.schooljaar, new Date().getFullYear())),
    naam: isBestuur ? org.bestuurNaam || 'Bestuur' : (vindSchool(org, doel.schoolId)?.naam ?? 'School'),
  };
}

function Teller({ label, waarde, accent }: { label: string; waarde: string; accent?: boolean }) {
  return (
    <td>
      <div className="kk-label">{label}</div>
      <div className="kk-waarde" style={accent ? { color: 'var(--status-warning)' } : undefined}>
        {waarde}
      </div>
    </td>
  );
}

function Lijst({ titel, items }: { titel: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div style={{ flex: 1 }}>
      <h3>{titel}</h3>
      <ul>
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

export function Gespreksdossier({ state, doel, gesprekId }: { state: State; doel: EditScope; gesprekId: string }) {
  const d = dossierGegevens(state, doel, gesprekId);
  const bestuur = state.organisatie.bestuurNaam;
  return (
    <div className="print-only kk-print" data-printweergave="dossier">
      <style>{PRINT_CSS}</style>
      <style>{'@media print { @page { size: A4 portrait; margin: 14mm; } }'}</style>
      <div className="kk-kop">
        <p className="kk-eyebrow">Gespreksdossier · {bestuur || 'Kwaliteitskalender VO'}</p>
        <h1>
          {d.gesprek.naam}: {d.naam}
        </h1>
        <p className="kk-sub">
          Schooljaar {state.schooljaar} · deadline {formatDatumLang(d.deadline)}
          {d.gesprek.thema ? ` · ${d.gesprek.thema}` : ''}
        </p>
      </div>

      <table className="kk-tellers">
        <tbody>
          <tr>
            <Teller label="Activiteiten" waarde={String(d.v.totaal)} />
            <Teller label="Gereed" waarde={`${d.v.gereed} (${d.v.pct}%)`} />
            <Teller label="Bezig" waarde={String(d.v.bezig)} />
            <Teller label="Gepland" waarde={String(d.v.gepland)} />
            <Teller label="Risico" waarde={String(d.v.risico)} accent={d.v.risico > 0} />
            <Teller label="Afwijkingen" waarde={String(d.afw.length)} />
          </tr>
        </tbody>
      </table>

      {d.inhoud && (
        <>
          <h2>Vereiste input voor dit gesprek</h2>
          <div style={{ display: 'flex', gap: '16pt' }}>
            <Lijst
              titel={d.isBestuur ? 'Bestuursinput' : 'Schoolinput'}
              items={d.isBestuur ? d.inhoud.bestuursinput : d.inhoud.schoolinput}
            />
            <Lijst titel="Output van het gesprek" items={d.inhoud.output} />
          </div>
        </>
      )}

      <h2>Voorbereiding: activiteiten voor dit gesprek</h2>
      {d.items.length === 0 ? (
        <p className="kk-sub">Geen activiteiten gekoppeld aan dit gesprek.</p>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th style={{ width: '24%' }}>Activiteit</th>
                <th style={{ width: '8%' }}>Standaard</th>
                <th style={{ width: '9%' }}>Status</th>
                <th style={{ width: '13%' }}>Eigenaar</th>
                <th style={{ width: '10%' }}>Deadline</th>
                <th style={{ width: '19%' }}>Bewijs</th>
                <th>Notitie</th>
              </tr>
            </thead>
            <tbody>
              {d.items.map((i) => {
                const a = activiteitVan(i);
                return (
                  <tr key={i.uid}>
                    <td style={{ fontWeight: 600 }}>
                      {effectieveNaam(i)}
                      {a?.verplicht ? ' *' : ''}
                    </td>
                    <td>{a?.standaard ?? ''}</td>
                    <td style={{ fontWeight: 600, color: STATUS_PRINT_KLEUR[i.status] }}>{statusLabel(i.status)}</td>
                    <td>{i.eigenaar || '-'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{i.deadline ? formatDatumKort(i.deadline) : i.maand}</td>
                    <td>
                      {(i.bewijs ?? []).length === 0
                        ? '-'
                        : (i.bewijs ?? []).map((b, n) => (
                            <div key={b.id} style={{ wordBreak: 'break-word' }}>
                              {n + 1}. {b.label}
                              {b.url ? <span style={{ color: 'var(--text-muted)' }}>: {b.url}</span> : null}
                            </div>
                          ))}
                    </td>
                    <td>{i.notitie ?? ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="kk-klein" style={{ margin: '3pt 0 0' }}>
            * = verplichte activiteit
          </p>
        </>
      )}

      {d.afw.length > 0 && (
        <div style={{ breakInside: 'avoid' }}>
          <h2>Afwijkingen van de standaardkoppeling</h2>
          <table>
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Activiteit</th>
                <th>Reden</th>
              </tr>
            </thead>
            <tbody>
              {d.afw.map((i) => (
                <tr key={i.uid}>
                  <td>{effectieveNaam(i)}</td>
                  <td>{i.afwijking?.reden}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {d.signalen.length > 0 && (
        <div className="kk-signaal">
          <h2>Signalen voor het gesprek</h2>
          <ul>
            {d.signalen.map((s) => (
              <li key={s.code}>
                Vaste standaard <strong>{s.code}</strong> ({s.naam}) is op de jaarkalender nog niet afgedekt.
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="kk-voet">
        Gemaakt met de Kwaliteitskalender VO op {formatDatumLang(new Date())}
        {bestuur ? ` · ${bestuur}` : ''}
      </p>
    </div>
  );
}
