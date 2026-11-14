import { ChevronRight } from 'lucide-react';
import { Select, cx } from '../componenten';
import { NIVEAU_ICONEN, NIVEAU_LABELS } from '../componenten/stijlen';
import { clusterNaamVan, scholenInCluster, vindSchool } from '../domein/berekeningen';
import { aantal } from '../domein/hulp';
import { useStore } from '../store';

/**
 * Subheader met de scope: "{niveau} › {bestuur | cluster-select | school-select}".
 * Anders dan het origineel toont de schoolregel de clusternaam in plaats van het cluster-id.
 */
export function Scopebalk() {
  const { state, niveau, clusterId, setClusterId, schoolId, setSchoolId } = useStore();
  const org = state.organisatie;
  const NiveauIcoon = NIVEAU_ICONEN[niveau];
  const BestuurIcoon = NIVEAU_ICONEN.bestuur;

  let inhoud: React.ReactNode;
  if (niveau === 'bestuur') {
    inhoud = (
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <BestuurIcoon className="h-4 w-4 text-ink-subtle" aria-hidden />
        <span className="truncate font-semibold text-ink-strong">{org.bestuurNaam || 'Bestuur'}</span>
        <span className="shrink-0 text-ink-muted">· {aantal(org.scholen.length, 'school', 'scholen')}</span>
      </span>
    );
  } else if (niveau === 'cluster') {
    const n = scholenInCluster(org, clusterId).length;
    inhoud = (
      <span className="flex min-w-0 items-center gap-3">
        <Select
          aria-label="Kies een cluster"
          veldMaat="sm"
          className="w-auto min-w-[10rem] max-w-[16rem] font-medium"
          value={clusterId}
          onChange={(e) => setClusterId(e.target.value)}
          options={org.clusters.map((c) => ({ value: c.id, label: c.naam }))}
        />
        <span className="shrink-0 text-sm text-ink-muted">{aantal(n, 'school', 'scholen')}</span>
      </span>
    );
  } else {
    const school = vindSchool(org, schoolId);
    const cluster = clusterNaamVan(org, school);
    inhoud = (
      <span className="flex min-w-0 items-center gap-3">
        {org.scholen.length > 0 ? (
          <Select
            aria-label="Kies een school"
            veldMaat="sm"
            className="w-auto min-w-[10rem] max-w-[16rem] font-medium"
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            options={org.scholen.map((s) => ({ value: s.id, label: s.naam }))}
          />
        ) : (
          <span className="text-sm text-ink-muted">Nog geen scholen</span>
        )}
        {school && (
          <span className="hidden truncate text-sm text-ink-muted sm:inline">
            {school.type}
            {cluster ? ` · ${cluster}` : ''}
          </span>
        )}
      </span>
    );
  }

  return (
    <div className="no-print border-b border-niveau-border bg-niveau-surface">
      <div className="mx-auto flex h-[52px] max-w-content items-center gap-2 px-4 sm:gap-3 md:px-6">
        <span className={cx('inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-niveau-strong')}>
          <NiveauIcoon className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{NIVEAU_LABELS[niveau]}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
        {inhoud}
      </div>
    </div>
  );
}
