import { dateLocale } from './locale';

/** Fonctions pures du forum (testables). */

/** Extrait une date ISO d'un champ ENT (`{$date}` ou chaîne) puis la formate jj/mm/aaaa. */
export function toIso(d?: { $date: string } | string): string | undefined {
  if (!d) return undefined;
  return typeof d === 'string' ? d : d.$date;
}

export function formatDate(d?: { $date: string } | string): string {
  const iso = toIso(d);
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(dateLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Date et heure jj/mm/aaaa hh:mm : l'ordre de lecture d'un fil de discussion se juge à l'heure. */
export function formatDateTime(d?: { $date: string } | string): string {
  const iso = toIso(d);
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString(dateLocale(), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Messages du plus ancien au plus récent (par date de création), sans modifier le tableau reçu. */
export function sortMessages<T extends { created?: { $date: string } | string }>(messages: T[]): T[] {
  return [...messages].sort((a, b) => (toIso(a.created) ?? '').localeCompare(toIso(b.created) ?? ''));
}

/** Nom d'affichage d'un propriétaire, avec repli. */
export function ownerName(owner?: { displayName?: string }): string {
  return owner?.displayName ?? '';
}

/** Icône bootstrap dérivée du champ `icon` d'une catégorie (repli neutre). */
export function categoryIcon(icon?: string): string {
  return icon && icon.trim() ? icon : 'forum';
}
