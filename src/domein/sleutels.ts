/**
 * Sleutels van samen te voegen entiteiten. Ze worden gebruikt voor tombstones
 * (State.verwijderd) en in samenvoegen.ts.
 *
 *   school:{id}               een school (verwijderen = ook haar kalender)
 *   cluster:{id}              een cluster
 *   gesprek:{id}              een gesprek uit de cyclus
 *   item:b:{uid}              item op de bestuurskalender
 *   item:s:{schoolId}:{uid}   item op een schoolkalender
 *   instelling:{naam}         losse instelling (bestuurNaam, schooljaar); nooit een tombstone
 */
import type { EditScope, SchoolId } from './types';

export const schoolSleutel = (id: SchoolId) => `school:${id}`;
export const clusterSleutel = (id: string) => `cluster:${id}`;
export const gesprekSleutel = (id: string) => `gesprek:${id}`;

/** Kalendercode: "b" voor het bestuur, "s:{schoolId}" voor een school. */
export function kalenderCode(scope: EditScope): string {
  return scope.kind === 'bestuur' ? 'b' : `s:${scope.schoolId}`;
}

export function itemSleutel(scope: EditScope, uid: string): string {
  return `item:${kalenderCode(scope)}:${uid}`;
}

export function itemSleutelVoorSchool(schoolId: SchoolId, uid: string): string {
  return `item:s:${schoolId}:${uid}`;
}

export function itemSleutelVoorBestuur(uid: string): string {
  return `item:b:${uid}`;
}
