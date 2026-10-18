/** Droits du forum sur une catégorie (parité AngularJS : `resource-right` manage / publish / contrib). */

const P = 'net-atos-entng-forum-controllers-ForumController|';

/** Action serveur qui matérialise chaque niveau de droit (clé des entrées `shared`). */
export const FORUM_RIGHT_ACTIONS = {
  /** Renommer, partager, supprimer la catégorie. */
  manager: `${P}updateCategory`,
  /** Modifier ou supprimer sujets et messages, verrouiller un sujet. */
  publish: `${P}updateSubject`,
  /** Créer un sujet, répondre. */
  contrib: `${P}createSubject`,
} as const;

/** Workflow « créer une catégorie ». */
export const CREATE_CATEGORY_WORKFLOW = 'net.atos.entng.forum.controllers.ForumController|createCategory';

type Shared = Array<Record<string, unknown> & { userId?: string; groupId?: string }>;
interface Rightable {
  owner?: { userId: string };
  shared?: Shared;
}
interface Me {
  userId: string;
  groupsIds?: string[];
}

export type ForumRight = keyof typeof FORUM_RIGHT_ACTIONS;

/**
 * A le droit : propriétaire, ou partage (à soi ou à un de ses groupes) portant l'action correspondante.
 * Ex. catégorie partagée au groupe « Enseignants » avec `…|createSubject: true` → contribution autorisée.
 */
export function hasForumRight(cat: Rightable | undefined, me: Me, right: ForumRight): boolean {
  if (!cat) return false;
  if (cat.owner?.userId === me.userId) return true;
  const action = FORUM_RIGHT_ACTIONS[right];
  const groups = new Set(me.groupsIds ?? []);
  return (cat.shared ?? []).some(
    (s) => s[action] === true && ((s.userId && s.userId === me.userId) || (s.groupId && groups.has(s.groupId))),
  );
}

/**
 * Peut modifier ou supprimer un message : droit « publish », ou auteur du message avec droit de contribution
 * (parité `ownerCanEditMessage`).
 */
export function canEditMessage(cat: Rightable | undefined, me: Me, message: { owner?: { userId: string } }): boolean {
  return hasForumRight(cat, me, 'publish') || (message.owner?.userId === me.userId && hasForumRight(cat, me, 'contrib'));
}
