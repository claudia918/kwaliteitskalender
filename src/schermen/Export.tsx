/**
 * Scherm: Exporteren (inventaris §1.15 en §5). Gespreksdossier (A4), de kalender naar Excel of
 * als A3-print, en de JSON-back-up (downloaden en terugzetten, ook uit de oude online versie).
 * Het gedeelde kalenderbestand zelf staat op Gegevens & delen; hier wordt daar alleen naar verwezen.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArchiveRestore,
  Download,
  FileSpreadsheet,
  FileText,
  FolderSync,
  Printer,
  ShieldCheck,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import {
  Begrip,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  IconTile,
  InfoBalk,
  NIVEAU_LABELS,
  PageHeader,
  Select,
  Veld,
  cx,
  useBevestig,
  useToast,
} from '../componenten';
import {
  aantal,
  cyclusOpVolgorde,
  komendGesprek,
  leesKalenderJson,
  naarBackupTekst,
  scholenInCluster,
  vandaagISO,
  type EditScope,
} from '../domein';
import { useScope, useStore } from '../store';
import { downloadTekst, kiesBestandHandmatig } from '../sync/bestandstoegang';
import { useSync } from '../sync/SyncProvider';
import { downloadExcel } from './export/excel';
import { Gespreksdossier, dossierGegevens } from './export/Gespreksdossier';
import { MatrixPrint } from './export/MatrixPrint';
import { backupBestandsnaam, excelBestandsnaam, excelTabbladen } from './export/rijen';

type PrintDoel = 'matrix' | 'dossier';

function Actie({
  icon,
  tone,
  titel,
  children,
  knop,
}: {
  icon: LucideIcon;
  tone: 'success' | 'danger' | 'info' | 'niveau';
  titel: string;
  children: ReactNode;
  knop: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-md border border-line-subtle p-4">
      <div className="flex items-center gap-3">
        <IconTile icon={icon} tone={tone} size="sm" />
        <h3 className="text-h4 text-ink-strong">{titel}</h3>
      </div>
      <p className="mt-2 flex-1 text-sm text-ink-muted">{children}</p>
      <div className="mt-4">{knop}</div>
    </div>
  );
}

export default function Export() {
  const { state, niveau, clusterId, schoolId, importeerState } = useStore();
  const { scope, scopeLabel } = useScope();
  const sync = useSync();
  const toast = useToast();
  const bevestig = useBevestig();
  const navigate = useNavigate();
  const org = state.organisatie;
  const cyclus = useMemo(() => cyclusOpVolgorde(state), [state]);

  /* ---------------- opties en print ---------------- */
  const [metCompliance, setMetCompliance] = useState(true);
  const [metAfwijkingen, setMetAfwijkingen] = useState(true);
  const [excelBezig, setExcelBezig] = useState(false);
  const [printDoel, setPrintDoel] = useState<PrintDoel>('matrix');
  const [printVraag, setPrintVraag] = useState(0);

  useEffect(() => {
    if (printVraag > 0) window.print();
  }, [printVraag]);
  useEffect(() => {
    const terug = () => setPrintDoel('matrix');
    window.addEventListener('afterprint', terug);
    return () => window.removeEventListener('afterprint', terug);
  }, []);
  const print = (doel: PrintDoel) => {
    setPrintDoel(doel);
    setPrintVraag((n) => n + 1);
  };

  /** Op clusterniveau: bij welke school hoort een item (extra kolom in Excel en print). */
  const schoolVanItem = useMemo(() => {
    if (niveau !== 'cluster') return undefined;
    const m = new Map<string, string>();
    for (const s of scholenInCluster(org, clusterId)) for (const i of state.schoolKalenders[s.id] ?? []) m.set(i.uid, s.naam);
    return m;
  }, [niveau, org, clusterId, state.schoolKalenders]);

  /* ---------------- gespreksdossier ---------------- */
  const standaardDoel = (): string => {
    if (niveau === 'school' && schoolId) return `s:${schoolId}`;
    const eerste = niveau === 'cluster' ? scholenInCluster(org, clusterId)[0] : org.scholen[0];
    return eerste ? `s:${eerste.id}` : 'bestuur';
  };
  const [doelKeuze, setDoelKeuze] = useState(standaardDoel);
  const doelGeldig = doelKeuze === 'bestuur' || org.scholen.some((s) => `s:${s.id}` === doelKeuze);
  const doelWaarde = doelGeldig ? doelKeuze : standaardDoel();
  const doel: EditScope = doelWaarde === 'bestuur' ? { kind: 'bestuur' } : { kind: 'school', schoolId: doelWaarde.slice(2) };

  const [gesprekKeuze, setGesprekKeuze] = useState(
    () => komendGesprek(state.organisatie.gesprekscyclus, state.schooljaar)?.gesprek.id ?? cyclus[0]?.id ?? '',
  );
  const gesprekId = cyclus.some((g) => g.id === gesprekKeuze) ? gesprekKeuze : (cyclus[0]?.id ?? '');
  const dossier = gesprekId ? dossierGegevens(state, doel, gesprekId) : null;

  const doelOpties = [
    ...org.scholen.map((s) => ({ value: `s:${s.id}`, label: s.naam || 'School' })),
    { value: 'bestuur', label: `${org.bestuurNaam || 'Bestuur'} (bestuurskalender)` },
  ];

  /* ---------------- Excel ---------------- */
  const downloadWerkmap = async () => {
    setExcelBezig(true);
    try {
      const bladen = excelTabbladen({
        items: scope.items,
        standaarden: scope.standaarden,
        cyclus,
        opties: { compliance: metCompliance, afwijkingen: metAfwijkingen },
        schoolVanItem,
      });
      await downloadExcel(excelBestandsnaam(scopeLabel, state.schooljaar), bladen);
      toast('Excel-bestand gedownload');
    } catch {
      toast('Het Excel-bestand kon niet worden gemaakt', 'danger');
    } finally {
      setExcelBezig(false);
    }
  };

  /* ---------------- back-up ---------------- */
  const downloadBackup = () => {
    downloadTekst(backupBestandsnaam(vandaagISO()), naarBackupTekst(state));
    toast('Back-up gedownload');
  };

  const importeer = async () => {
    const bestand = await kiesBestandHandmatig();
    if (!bestand) return;
    const tekst = await bestand.text();
    const r = leesKalenderJson(tekst);
    if (!r.ok) {
      toast(r.fout, 'danger', 4000);
      return;
    }
    if (r.isBestand) {
      const naarGegevens = await bevestig({
        titel: 'Dit is een gedeeld kalenderbestand',
        tekst:
          'Dit bestand is geen back-up maar een kalenderbestand om samen in te werken. Open of koppel het op de pagina Gegevens & delen. Daar kies je of je het samenvoegt met je huidige kalender of overneemt.',
        bevestigLabel: 'Naar Gegevens & delen',
        annuleerLabel: 'Annuleren',
      });
      if (naarGegevens) navigate('/gegevens');
      return;
    }
    let oud = false;
    try {
      oud = (JSON.parse(tekst) as { versie?: number }).versie !== 5;
    } catch {
      /* al gecontroleerd */
    }
    const s = r.state;
    const nItems = s.bestuurItems.length + Object.values(s.schoolKalenders).reduce((n, l) => n + l.length, 0);
    const delen = [
      `Back-up van "${s.organisatie.bestuurNaam || 'onbekend bestuur'}" (${aantal(s.organisatie.scholen.length, 'school', 'scholen')}, ${aantal(nItems, 'activiteit', 'activiteiten')}, schooljaar ${s.schooljaar}) importeren? Dit vervangt alle gegevens die nu in de kalender staan.`,
    ];
    if (oud) delen.push('Deze back-up komt uit een vorige versie van de Kwaliteitskalender en wordt automatisch omgezet.');
    if (sync.status !== 'geen') {
      delen.push(
        `De koppeling met ${sync.bestandsnaam ?? 'het gedeelde bestand'} wordt daarbij verbroken. Het gedeelde bestand zelf blijft ongewijzigd.`,
      );
    }
    const ja = await bevestig({
      titel: 'Back-up importeren',
      tekst: delen.join(' '),
      bevestigLabel: 'Importeren en vervangen',
      annuleerLabel: 'Annuleren',
      gevaarlijk: true,
    });
    if (!ja) return;
    importeerState(s);
    toast('Back-up geïmporteerd');
  };

  const gekoppeld = sync.status === 'gekoppeld' || sync.status === 'toestemming-nodig';
  const leeg = scope.items.length === 0;

  return (
    <>
      <div className="no-print space-y-6">
        <PageHeader
          eyebrow="Voorbereiden"
          title="Dossier en export"
          subtitle={`Print het dossier voor een gesprek, zet de kalender in Excel of PDF, of maak een back-up. Nu: ${scopeLabel}, ${aantal(scope.items.length, 'activiteit', 'activiteiten')}.`}
        />

        {/* Gespreksdossier */}
        <Card rondleiding="export-dossier" padding="lg" className="border-niveau-border">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <IconTile icon={FileText} tone="niveau" />
            <div className="min-w-0 flex-1">
              <h2 className="text-h3 text-ink-strong">Gespreksdossier</h2>
              <p className="mt-1 max-w-3xl text-sm text-ink-muted">
                Een <Begrip term="gespreksdossier" /> op A4 voor één school en één gesprek: activiteiten met status, eigenaar,{' '}
                <Begrip term="bewijs" />, notities en afwijkingen. Klaar voor het gesprek tussen bestuur en school.
              </p>
              {cyclus.length === 0 ? (
                <InfoBalk tone="neutral" className="mt-4">
                  Er is nog geen gesprekscyclus ingesteld. Dat doe je bij Organisatie.
                </InfoBalk>
              ) : (
                <>
                  <div className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-2">
                    <Veld label="Kalender">
                      {(id) => (
                        <Select id={id} value={doelWaarde} onChange={(e) => setDoelKeuze(e.target.value)} options={doelOpties} />
                      )}
                    </Veld>
                    <Veld label="Gesprek">
                      {(id) => (
                        <Select
                          id={id}
                          value={gesprekId}
                          onChange={(e) => setGesprekKeuze(e.target.value)}
                          options={cyclus.map((g) => ({ value: g.id, label: g.naam }))}
                        />
                      )}
                    </Veld>
                  </div>
                  {dossier && (
                    <p className="mt-3 text-sm text-ink-body" data-testid="dossier-samenvatting">
                      <span className="font-semibold text-ink-strong">
                        {dossier.gesprek.naam}, {dossier.naam}:
                      </span>{' '}
                      {dossier.v.totaal === 0
                        ? 'nog geen activiteiten gekoppeld aan dit gesprek.'
                        : `${aantal(dossier.v.totaal, 'activiteit', 'activiteiten')}, ${dossier.v.gereed} gereed (${dossier.v.pct}%)` +
                          (dossier.v.risico ? `, ${dossier.v.risico} met risico` : '') +
                          (dossier.afw.length ? `, ${aantal(dossier.afw.length, 'afwijking', 'afwijkingen')}` : '') +
                          '.'}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Button variant="primary" icon={Printer} onClick={() => print('dossier')}>
                      Print gespreksdossier
                    </Button>
                    <span className="text-xs text-ink-subtle">Een PDF maak je met “Opslaan als PDF” in het printvenster.</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Kalender: Excel en print */}
        <Card rondleiding="export-kalender"
          padding="lg"
          title="Kalender exporteren"
          subtitle={
            <>
              De kalender van <strong className="font-semibold text-ink-strong">{scopeLabel}</strong> (
              {NIVEAU_LABELS[niveau].toLowerCase()}). Voor een andere kalender kies je bovenin wat je bekijkt.
            </>
          }
        >
          <fieldset>
            <legend className="eyebrow mb-3">Wat neem je mee</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Checkbox
                checked={metCompliance}
                onChange={setMetCompliance}
                label="Dekking standaarden"
                beschrijving="Dekking per standaard en de vaste standaarden"
              />
              <Checkbox
                checked={metAfwijkingen}
                onChange={setMetAfwijkingen}
                label="Afwijkingen"
                beschrijving="Aangepaste gesprekskoppelingen met reden"
              />
            </div>
          </fieldset>
          {leeg && (
            <InfoBalk tone="neutral" className="mt-5">
              Op deze kalender staan nog geen activiteiten. De export bevat dan alleen de kolomkoppen
              {metCompliance ? ' en de dekking per standaard' : ''}.
            </InfoBalk>
          )}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Actie
              icon={FileSpreadsheet}
              tone="success"
              titel="Excel"
              knop={
                <Button variant="primary" icon={Download} onClick={() => void downloadWerkmap()} disabled={excelBezig}>
                  {excelBezig ? 'Bezig…' : 'Download Excel'}
                </Button>
              }
            >
              Werkmap met de tabbladen Kalender{metCompliance ? ', Dekking standaarden' : ''}
              {metAfwijkingen ? ' en Afwijkingen' : ''}, inclusief eigenaar, deadline, bewijs en notities.
              {niveau === 'cluster' ? ' Met een kolom School.' : ''}
            </Actie>
            <Actie
              icon={Printer}
              tone="danger"
              titel="Print of PDF"
              knop={
                <Button variant="secondary" icon={Printer} onClick={() => print('matrix')}>
                  Print / PDF
                </Button>
              }
            >
              De jaarkalender als matrix (standaard × maand) op A3 liggend
              {metCompliance || metAfwijkingen ? ', met het gekozen overzicht erachter' : ''}. Kies in het printvenster
              “Opslaan als PDF”.
            </Actie>
          </div>
        </Card>

        {/* Back-up */}
        <Card rondleiding="export-backup" padding="lg">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <IconTile icon={ArchiveRestore} tone="info" />
              <div className="min-w-0 flex-1">
                <h2 className="text-h3 text-ink-strong">
                  <Begrip term="back-up">Back-up</Begrip> (JSON)
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Een kopie van al je gegevens in één leesbaar bestand: het bestuur, alle scholen en clusters, alle
                  kalenders en de gesprekscyclus. Handig als reservekopie of om je gegevens mee te nemen (AVG).
                </p>
                <p className="mt-2 text-sm text-ink-muted">
                  Met <strong className="font-semibold text-ink-strong">Back-up importeren</strong> zet je een back-up
                  terug. Dat vervangt alles wat nu in de kalender staat. Back-ups uit de vorige online versie van de
                  Kwaliteitskalender kun je ook importeren.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="secondary" icon={Download} onClick={downloadBackup}>
                    Download back-up
                  </Button>
                  <Button variant="ghost" icon={Upload} onClick={() => void importeer()}>
                    Back-up importeren…
                  </Button>
                </div>
                <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-subtle">
                  <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                  Een back-up bevat alles wat jullie hebben ingevuld, ook notities. Bewaar hem in je eigen beveiligde
                  omgeving.
                </p>
              </div>
            </div>

            <aside className="rounded-md border border-line-subtle bg-surface-subtle p-4" aria-labelledby="verschil-kop">
              <h3 id="verschil-kop" className="text-h4 text-ink-strong">
                Back-up of gedeeld kalenderbestand?
              </h3>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="font-semibold text-ink-strong">Back-up</dt>
                  <dd className="text-ink-muted">
                    Een momentopname voor jezelf. Verandert niet meer. Importeren vervangt alles.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink-strong">Gedeeld kalenderbestand</dt>
                  <dd className="text-ink-muted">
                    Het bestand in een gedeelde map waarin je met collega’s samenwerkt. Het wordt steeds bijgewerkt en
                    wijzigingen worden samengevoegd, niet vervangen.
                  </dd>
                </div>
              </dl>
              {gekoppeld && (
                <p className={cx('mt-3 flex items-start gap-1.5 text-sm text-niveau-strong')}>
                  <FolderSync className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>Je kalender is gekoppeld aan {sync.bestandsnaam ?? 'een gedeeld bestand'}.</span>
                </p>
              )}
              <ButtonLink to="/gegevens" size="sm" variant="secondary" icon={FolderSync} className="mt-4">
                Naar Gegevens &amp; delen
              </ButtonLink>
            </aside>
          </div>
        </Card>
      </div>

      {printDoel === 'dossier' && gesprekId ? (
        <Gespreksdossier state={state} doel={doel} gesprekId={gesprekId} />
      ) : (
        <MatrixPrint
          bestuurNaam={org.bestuurNaam}
          scopeLabel={scopeLabel}
          niveauLabel={NIVEAU_LABELS[niveau]}
          schooljaar={state.schooljaar}
          items={scope.items}
          standaarden={scope.standaarden}
          cyclus={cyclus}
          samenvoegen={niveau === 'cluster'}
          schoolVanItem={schoolVanItem}
          opties={{ compliance: metCompliance, afwijkingen: metAfwijkingen }}
        />
      )}
    </>
  );
}
