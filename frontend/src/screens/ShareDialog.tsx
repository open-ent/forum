import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { api, ShareAction } from '../api';

/**
 * Modale de partage d'une catégorie (modèle de droits entcore classique).
 *
 * Réimplémentée sur l'API existante `GET/PUT /forum/share/...` — l'ancienne IHM
 * AngularJS utilisait la directive infra `<share-panel>`, indisponible en React ;
 * le `ShareModal` de @open-ent/react vise le NOUVEAU modèle de droits (@open-ent/client),
 * incompatible avec le backend forum. Modale volontairement simple : une ligne par
 * destinataire, une case par niveau de droit, recherche pour ajouter.
 */

/** Ordre d'affichage (droits croissants) + libellés des niveaux entcore du forum. */
const LEVELS: { key: string; fr: string }[] = [
  { key: 'category.read', fr: 'Lecture' },
  { key: 'category.contrib', fr: 'Contribution' },
  { key: 'category.publish', fr: 'Publication' },
  { key: 'category.manager', fr: 'Gestion' },
];

type Kind = 'group' | 'user';
interface Row {
  id: string;
  kind: Kind;
  label: string;
  levels: Set<string>; // displayName des niveaux cochés
}

export function ShareDialog({ catId, onClose }: { catId: string; onClose: () => void }) {
  const { t } = useTranslation(['forum', 'common']);
  const qc = useQueryClient();
  const shareQuery = useQuery({ queryKey: ['forum', 'share', catId], queryFn: () => api.getShare(catId) });

  const [rows, setRows] = useState<Row[] | null>(null);
  const [search, setSearch] = useState('');

  // Actions par displayName (pour construire le batch).
  const actionsByLevel = useMemo(() => {
    const m = new Map<string, ShareAction>();
    shareQuery.data?.actions.forEach((a) => m.set(a.displayName, a));
    return m;
  }, [shareQuery.data]);

  // Initialise les lignes à partir de l'état partagé courant (une seule fois).
  const initialRows = useMemo<Row[]>(() => {
    const data = shareQuery.data;
    if (!data) return [];
    const levelActive = (checked: string[], lvl: string) =>
      (actionsByLevel.get(lvl)?.name ?? []).every((n) => checked.includes(n));
    const out: Row[] = [];
    const push = (kind: Kind, id: string, label: string, checked: string[]) => {
      const levels = new Set(LEVELS.map((l) => l.key).filter((k) => levelActive(checked, k)));
      out.push({ id, kind, label, levels });
    };
    Object.entries(data.groups.checked).forEach(([id, ch]) => {
      const g = data.groups.visibles.find((v) => v.id === id);
      push('group', id, g?.name ?? id, ch);
    });
    Object.entries(data.users.checked).forEach(([id, ch]) => {
      const u = data.users.visibles.find((v) => v.id === id);
      push('user', id, u?.username ?? id, ch);
    });
    return out;
  }, [shareQuery.data, actionsByLevel]);

  const current = rows ?? initialRows;

  // Destinataires ajoutables (visibles non encore présents) filtrés par la recherche.
  const candidates = useMemo(() => {
    const data = shareQuery.data;
    if (!data || search.trim().length < 1) return [];
    const q = search.trim().toLowerCase();
    const present = new Set(current.map((r) => r.id));
    const groups = data.groups.visibles
      .filter((g) => !present.has(g.id) && g.name.toLowerCase().includes(q))
      .map((g) => ({ id: g.id, kind: 'group' as Kind, label: g.name }));
    const users = data.users.visibles
      .filter((u) => !present.has(u.id) && u.username.toLowerCase().includes(q))
      .map((u) => ({ id: u.id, kind: 'user' as Kind, label: u.username }));
    return [...groups, ...users].slice(0, 12);
  }, [shareQuery.data, search, current]);

  const setRowsFrom = (next: Row[]) => setRows(next);

  const toggleLevel = (id: string, lvl: string) => {
    setRowsFrom(
      current.map((r) => {
        if (r.id !== id) return r;
        const levels = new Set(r.levels);
        if (levels.has(lvl)) levels.delete(lvl);
        else levels.add(lvl);
        return { ...r, levels };
      }),
    );
  };

  const addRecipient = (c: { id: string; kind: Kind; label: string }) => {
    setRowsFrom([...current, { ...c, levels: new Set(['category.read']) }]);
    setSearch('');
  };

  const removeRow = (id: string) => setRowsFrom(current.filter((r) => r.id !== id));

  const saveMut = useMutation({
    mutationFn: async () => {
      const batch = { users: {} as Record<string, string[]>, groups: {} as Record<string, string[]>, bookmarks: {} };
      current.forEach((r) => {
        if (r.levels.size === 0) return; // retiré (droits supprimés)
        const acts = new Set<string>();
        r.levels.forEach((lvl) => (actionsByLevel.get(lvl)?.name ?? []).forEach((n) => acts.add(n)));
        (r.kind === 'group' ? batch.groups : batch.users)[r.id] = [...acts];
      });
      await api.shareResource(catId, batch);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum', 'share', catId] });
      onClose();
    },
  });

  return (
    <div
      className="modal-backdrop-forum"
      role="dialog"
      aria-modal="true"
      aria-label={t('forum.category.share', { defaultValue: 'Partager la catégorie' })}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
      }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded p-24"
        style={{ width: 'min(720px, 92vw)', maxHeight: '86vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-center mb-16">
          <h2 className="m-0">{t('forum.category.share', { defaultValue: 'Partager la catégorie' })}</h2>
          <button type="button" className="btn btn-link p-0" aria-label={t('close', { defaultValue: 'Fermer' })} onClick={onClose}>
            ✕
          </button>
        </div>

        {shareQuery.isLoading && <p>{t('forum.loading', { defaultValue: 'Chargement…' })}</p>}
        {shareQuery.isError && (
          <div className="alert alert-warning" role="alert">
            {t('forum.error', { defaultValue: 'Une erreur est survenue.' })}
          </div>
        )}

        {shareQuery.data && (
          <>
            {/* Recherche d'un destinataire à ajouter */}
            <div className="mb-16 position-relative">
              <input
                type="text"
                className="form-control"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('forum.category.share.search', { defaultValue: 'Rechercher un groupe ou une personne…' })}
                aria-label={t('forum.category.share.search', { defaultValue: 'Rechercher un destinataire' })}
              />
              {candidates.length > 0 && (
                <ul className="list-unstyled border rounded bg-white position-absolute w-100 mt-2" style={{ zIndex: 10, maxHeight: 240, overflow: 'auto' }}>
                  {candidates.map((c) => (
                    <li key={`${c.kind}-${c.id}`}>
                      <button type="button" className="btn btn-link text-start w-100 px-12 py-8" onClick={() => addRecipient(c)}>
                        {c.kind === 'group' ? '👥 ' : '👤 '}
                        {c.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Matrice destinataires × niveaux */}
            {current.length === 0 ? (
              <p className="text-muted">{t('forum.category.share.empty', { defaultValue: 'Aucun partage. Recherchez un destinataire ci-dessus.' })}</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('forum.category.share.recipient', { defaultValue: 'Destinataire' })}</th>
                    {LEVELS.map((l) => (
                      <th key={l.key} className="text-center">{l.fr}</th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {current.map((r) => (
                    <tr key={`${r.kind}-${r.id}`}>
                      <td>
                        {r.kind === 'group' ? '👥 ' : '👤 '}
                        {r.label}
                      </td>
                      {LEVELS.map((l) => (
                        <td key={l.key} className="text-center">
                          <input
                            type="checkbox"
                            checked={r.levels.has(l.key)}
                            aria-label={`${r.label} — ${l.fr}`}
                            onChange={() => toggleLevel(r.id, l.key)}
                          />
                        </td>
                      ))}
                      <td className="text-end">
                        <button type="button" className="btn btn-link p-0 text-danger" onClick={() => removeRow(r.id)} aria-label={t('forum.delete', { defaultValue: 'Supprimer' })}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {saveMut.isError && (
              <div className="alert alert-warning" role="alert">
                {t('forum.error', { defaultValue: 'Une erreur est survenue.' })}
              </div>
            )}

            <div className="d-flex justify-content-end gap-8 mt-16">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                {t('forum.category.share.return', { defaultValue: 'Annuler' })}
              </button>
              <button type="button" className="btn btn-primary" disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
                {t('forum.category.share.submit', { defaultValue: 'Partager' })}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ShareDialog;
