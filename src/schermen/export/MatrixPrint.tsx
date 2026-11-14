/**
 * Printweergave van de kalender (inventaris §5.3, "YS"): standaard × maand op A3 liggend,
 * met daarna (optioneel) de compliance en de afwijkingen. Alleen zichtbaar bij printen.
 */
import { Fragment } from 'react';
import {
  GEBIEDEN,
  MAANDEN,
  STATUS_VOLGORDE,
  activiteitVan,
  afwijkingen,
  dekkingPerStandaard,
  effectieveNaam,
  formatDatumLang,
  vindGesprek,
  type GebiedCode,
  type Gesprek,
  type KalenderItem,
  type Standaard,
  type Status,
} from '../../domein';
import { PRINT_CSS, STATUS_PRINT_KLEUR } from './printstijl';
import { statusLabel } from './rijen';

export interface MatrixPrintProps {
  bestuurNaam: string;
  scopeLabel: string;
  niveauLabel: string;
  schooljaar: string;
  items: KalenderItem[];
  standaarden: Standaard[];
  cyclus: Gesprek[];
  /** Clusterniveau: dezelfde activiteit van meerdere scholen één keer tonen, met aantal. */
  samenvoegen: boolean;
  schoolVanItem?: Map<string, string>;
  opties: { compliance: boolean; afwijkingen: boolean };
}

interface Regel {
  sleutel: string;
  naam: string;
  aantal: number;
  status?: Status;
}

function regelsVoorCel(items: KalenderItem[], samenvoegen: boolean): Regel[] {
  if (!samenvoegen) {
    return items
      .map((i) => ({ sleutel: i.uid, naam: effectieveNaam(i), aantal: 1, status: i.status }))
      .sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));
  }
  const per = new Map<string, Regel>();
  for (const i of items) {
    const naam = effectieveNaam(i);
    const r = per.get(naam);
    if (r) r.aantal += 1;
    else per.set(naam, { sleutel: naam, naam, aantal: 1 });
  }
  return [...per.values()].sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));
}

export function MatrixPrint(p: MatrixPrintProps) {
  const perStandaard = new Map<string, KalenderItem[]>();
  for (const i of p.items) {
    const code = activiteitVan(i)?.standaard;
    if (code) perStandaard.set(code, [...(perStandaard.get(code) ?? []), i]);
  }
  const gebieden: { gebied: GebiedCode; standaarden: Standaard[] }[] = [];
  for (const s of p.standaarden) {
    let g = gebieden.find((x) => x.gebied === s.gebied);
    if (!g) gebieden.push((g = { gebied: s.gebied, standaarden: [] }));
    g.standaarden.push(s);
  }
  const dekking = dekkingPerStandaard(p.items, p.standaarden);
  const afw = afwijkingen(p.items);

  return (
    <div className="print-only kk-print" data-printweergave="matrix">
      <style>{PRINT_CSS}</style>
      <div className="kk-kop">
        <p className="kk-eyebrow">
          Kwaliteitskalender VO{p.bestuurNaam ? ` · ${p.bestuurNaam}` : ''}
        </p>
        <h1>
          Jaarkalender {p.scopeLabel}
        </h1>
        <p className="kk-sub">
          {p.niveauLabel} · schooljaar {p.schooljaar} · {p.items.length}{' '}
          {p.items.length === 1 ? 'activiteit' : 'activiteiten'}
          {p.samenvoegen ? ' van alle scholen in het cluster samen; achter elke activiteit staat bij hoeveel scholen' : ''}
        </p>
      </div>

      <table className="kk-matrix">
        <thead>
          <tr>
            <th className="kk-std">Standaard</th>
            {MAANDEN.map((m) => (
              <th key={m} className="kk-maand">
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {gebieden.map(({ gebied, standaarden }) => (
            <Fragment key={gebied}>
              <tr className="kk-gebied">
                <td colSpan={13}>
                  {gebied} · {GEBIEDEN[gebied]?.naam}
                </td>
              </tr>
              {standaarden.map((s) => {
                const lijst = perStandaard.get(s.code) ?? [];
                return (
                  <tr key={s.code}>
                    <td className="kk-std">
                      <strong>{s.code}</strong>
                      {s.kern && <span className="kk-klein"> · vaste standaard</span>}
                      <br />
                      <span style={{ color: 'var(--text-muted)' }}>{s.naam}</span>
                    </td>
                    {MAANDEN.map((m) => (
                      <td key={m}>
                        {regelsVoorCel(
                          lijst.filter((i) => i.maand === m),
                          p.samenvoegen,
                        ).map((r) => (
                          <div key={r.sleutel} className="kk-act">
                            {r.status && (
                              <span
                                className="kk-dot"
                                style={{ background: STATUS_PRINT_KLEUR[r.status] }}
                                aria-label={statusLabel(r.status)}
                              />
                            )}
                            <span>
                              {r.naam}
                              {p.samenvoegen ? <span className="kk-klein"> · {r.aantal === 1 ? '1 school' : `${r.aantal} scholen`}</span> : null}
                            </span>
                          </div>
                        ))}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
      {!p.samenvoegen && (
        <div className="kk-legenda">
          {STATUS_VOLGORDE.map((s) => (
            <span key={s}>
              <span className="kk-dot" style={{ background: STATUS_PRINT_KLEUR[s] }} />
              {statusLabel(s)}
            </span>
          ))}
        </div>
      )}
      {p.items.length === 0 && <p className="kk-sub">Er staan nog geen activiteiten op deze kalender.</p>}

      {p.opties.compliance && (
        <div style={{ breakInside: 'avoid' }}>
          <h2>Compliance: dekking per standaard</h2>
          <table>
            <thead>
              <tr>
                <th style={{ width: '8%' }}>Code</th>
                <th>Standaard</th>
                <th style={{ width: '12%' }}>Vaste standaard</th>
                <th style={{ width: '12%' }}>Activiteiten</th>
                <th style={{ width: '10%' }}>Gereed</th>
                <th style={{ width: '10%' }}>Afgedekt</th>
              </tr>
            </thead>
            <tbody>
              {dekking.map((d) => (
                <tr key={d.standaard.code}>
                  <td>
                    <strong>{d.standaard.code}</strong>
                  </td>
                  <td>{d.standaard.naam}</td>
                  <td>{d.standaard.kern ? 'Ja' : ''}</td>
                  <td>{d.aantal}</td>
                  <td>{d.gereed}</td>
                  <td
                    style={
                      d.afgedekt
                        ? { color: 'var(--status-success)', fontWeight: 600 }
                        : { color: d.standaard.kern ? 'var(--status-warning)' : 'var(--text-muted)', fontWeight: 700 }
                    }
                  >
                    {d.afgedekt ? 'Ja' : 'Nee'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {p.opties.afwijkingen && (
        <div style={{ breakInside: 'avoid' }}>
          <h2>Afwijkingen van de standaardkoppeling</h2>
          {afw.length === 0 ? (
            <p className="kk-sub">Geen afwijkingen.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  {p.schoolVanItem && <th style={{ width: '18%' }}>School</th>}
                  <th>Activiteit</th>
                  <th style={{ width: '8%' }}>Standaard</th>
                  <th style={{ width: '16%' }}>Gekoppeld gesprek</th>
                  <th>Reden</th>
                </tr>
              </thead>
              <tbody>
                {afw.map((i) => (
                  <tr key={i.uid}>
                    {p.schoolVanItem && <td>{p.schoolVanItem.get(i.uid) ?? ''}</td>}
                    <td>{effectieveNaam(i)}</td>
                    <td>{activiteitVan(i)?.standaard ?? ''}</td>
                    <td>{vindGesprek(p.cyclus, i.gesprek).naam}</td>
                    <td>{i.afwijking?.reden}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <p className="kk-voet">
        Gemaakt met de Kwaliteitskalender VO op {formatDatumLang(new Date())}
        {p.bestuurNaam ? ` · ${p.bestuurNaam}` : ''}
      </p>
    </div>
  );
}
