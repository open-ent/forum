import { useEdificeClient } from '@open-ent/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Editor, EditorRef } from '@open-ent/react/editor';
import { FormEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { api } from '../api';
import { hasForumRight } from '../rights';
import { formatDate, ownerName } from '../utils';
import { ShareDialog } from './ShareDialog';

/** Écran catégorie : liste des sujets + création + édition du nom de catégorie et des titres de sujet. */
export function Category() {
  const { catId = '' } = useParams();
  const { t } = useTranslation(['forum', 'common']);
  const qc = useQueryClient();
  const { user } = useEdificeClient();
  const me = { userId: (user as { userId?: string } | undefined)?.userId ?? '', groupsIds: (user as { groupsIds?: string[] } | undefined)?.groupsIds };

  const categoryQuery = useQuery({
    queryKey: ['forum', 'category', catId],
    queryFn: () => api.getCategory(catId),
    enabled: !!catId,
  });
  const subjectsQuery = useQuery({
    queryKey: ['forum', 'category', catId, 'subjects'],
    queryFn: () => api.getSubjects(catId),
    enabled: !!catId,
  });

  const subjectsKey = ['forum', 'category', catId, 'subjects'];
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  // Un sujet naît avec son premier message (parité AngularJS `new-subject` : titre ET message obligatoires) ;
  // avant, le sujet créé en React restait vide.
  const firstMessageRef = useRef<EditorRef>(null);
  const [firstMessageEmpty, setFirstMessageEmpty] = useState(true);
  const createMut = useMutation({
    mutationFn: async () => {
      const content = (firstMessageRef.current?.getContent('html') as string) ?? '';
      const subject = await api.createSubject(catId, { title: title.trim() });
      await api.postMessage(catId, subject._id, { content });
    },
    onSuccess: () => {
      setTitle('');
      setFirstMessageEmpty(true);
      setCreating(false);
      qc.invalidateQueries({ queryKey: subjectsKey });
    },
  });
  const deleteSubjectMut = useMutation({
    mutationFn: (subId: string) => api.deleteSubject(catId, subId),
    onSuccess: () => qc.invalidateQueries({ queryKey: subjectsKey }),
  });
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim() && !firstMessageEmpty) createMut.mutate();
  };

  // Édition du NOM de la catégorie (icône conservée).
  const [editingCat, setEditingCat] = useState(false);
  const [catName, setCatName] = useState('');
  const renameCatMut = useMutation({
    mutationFn: () =>
      api.updateCategory(catId, { name: catName.trim(), icon: categoryQuery.data?.icon ?? '' }),
    onSuccess: () => {
      setEditingCat(false);
      qc.invalidateQueries({ queryKey: ['forum', 'category', catId] });
    },
  });

  // Édition du TITRE d'un sujet.
  const [editingSub, setEditingSub] = useState<string | null>(null);
  const [subTitle, setSubTitle] = useState('');
  const renameSubMut = useMutation({
    mutationFn: (subId: string) => api.updateSubject(catId, subId, { title: subTitle.trim(), locked: subjectsQuery.data?.find((s) => s._id === subId)?.locked ?? false }),
    onSuccess: () => {
      setEditingSub(null);
      qc.invalidateQueries({ queryKey: subjectsKey });
    },
  });

  const [sharing, setSharing] = useState(false);
  const canManage = hasForumRight(categoryQuery.data, me, 'manager');
  const canContrib = hasForumRight(categoryQuery.data, me, 'contrib');
  const canPublish = hasForumRight(categoryQuery.data, me, 'publish');
  // Le verrou est posé/levé par un modérateur (droit « publish ») : on le renvoie à chaque modification de titre,
  // sinon un renommage le ferait sauter.
  const lockMut = useMutation({
    mutationFn: (v: { subId: string; title: string; locked: boolean }) => api.updateSubject(catId, v.subId, { title: v.title, locked: v.locked }),
    onSuccess: () => qc.invalidateQueries({ queryKey: subjectsKey }),
  });

  const subjects = subjectsQuery.data ?? [];

  return (
    <div>
      {sharing && <ShareDialog catId={catId} onClose={() => setSharing(false)} />}
      <p>
        <Link to="/">← {t('forum.back.to.categories')}</Link>
      </p>
      <div className="d-flex align-items-center justify-content-between mb-16">
        {editingCat ? (
          <form
            className="d-flex gap-8 flex-grow-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (catName.trim()) renameCatMut.mutate();
            }}
          >
            <input
              type="text"
              className="form-control"
              style={{ maxWidth: 420 }}
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              aria-label={t('forum.category.edit', { defaultValue: 'Renommer la catégorie' })}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" disabled={!catName.trim() || renameCatMut.isPending}>
              {t('forum.category.edit.finish')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditingCat(false)}>
              {t('forum.cancel', { defaultValue: 'Annuler' })}
            </button>
          </form>
        ) : (
          <div className="d-flex align-items-center gap-12">
            <h1 className="m-0">{categoryQuery.data?.name ?? t('forum.category')}</h1>
            {canManage && (
              <button
                type="button"
                className="btn btn-link p-0"
                onClick={() => {
                  setCatName(categoryQuery.data?.name ?? '');
                  setEditingCat(true);
                }}
              >
                {t('forum.category.edit', { defaultValue: 'Renommer' })}
              </button>
            )}
          </div>
        )}
        {!creating && !editingCat && (
          <div className="d-flex gap-8">
            {canManage && (
              <button type="button" className="btn btn-secondary" onClick={() => setSharing(true)}>
                {t('forum.category.share', { defaultValue: 'Partager' })}
              </button>
            )}
            {canContrib && (
              <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
                {t('forum.subject.new', { defaultValue: 'Nouveau sujet' })}
              </button>
            )}
          </div>
        )}
      </div>

      {creating && (
        <form className="mb-16" onSubmit={onSubmit}>
          <input
            type="text"
            className="form-control mb-8"
            style={{ maxWidth: 420 }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('forum.subject.placeholder', { defaultValue: 'Titre du sujet' })}
            aria-label={t('forum.subject.new', { defaultValue: 'Nouveau sujet' })}
            autoFocus
          />
          <label htmlFor="forum-first-message" className="fw-bold d-block mb-8">
            {t('forum.subject.message', { defaultValue: 'Message' })}
          </label>
          <div className="mb-8">
            <Editor
              id="forum-first-message"
              ref={firstMessageRef}
              content=""
              mode="edit"
              visibility="protected"
              onContentChange={({ editor }) => setFirstMessageEmpty(editor.isEmpty)}
            />
          </div>
          <div className="d-flex gap-8">
            <button type="submit" className="btn btn-primary" disabled={!title.trim() || firstMessageEmpty || createMut.isPending}>
              {t('forum.category.edit.finish')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setCreating(false)}>
              {t('forum.cancel', { defaultValue: 'Annuler' })}
            </button>
          </div>
        </form>
      )}

      {(deleteSubjectMut.isError || renameSubMut.isError || renameCatMut.isError || createMut.isError || lockMut.isError) && (
        <div className="alert alert-warning" role="alert" data-forum-error>
          {t('forum.error.forbidden', { defaultValue: "L'action a échoué (droit insuffisant ou erreur du serveur)." })}
        </div>
      )}
      {subjectsQuery.isLoading && <p>{t('forum.loading', { defaultValue: 'Chargement…' })}</p>}
      {subjectsQuery.isError && (
        <div className="alert alert-warning" role="alert">
          {t('forum.error', { defaultValue: 'Une erreur est survenue.' })}
        </div>
      )}
      {!subjectsQuery.isLoading && subjects.length === 0 && (
        <p className="text-muted">
          {t('forum.no.subjects', { defaultValue: 'Aucun sujet dans cette catégorie.' })}
        </p>
      )}

      <ul className="list-unstyled">
        {subjects.map((sub) => (
          <li key={sub._id} className="py-12 border-bottom d-flex justify-content-between align-items-start">
            {editingSub === sub._id ? (
              <form
                className="d-flex gap-8 flex-grow-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (subTitle.trim()) renameSubMut.mutate(sub._id);
                }}
              >
                <input
                  type="text"
                  className="form-control"
                  style={{ maxWidth: 420 }}
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                  aria-label={t('forum.subject.edit.title', { defaultValue: 'Renommer le sujet' })}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary" disabled={!subTitle.trim() || renameSubMut.isPending}>
                  {t('forum.category.edit.finish')}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingSub(null)}>
                  {t('forum.cancel', { defaultValue: 'Annuler' })}
                </button>
              </form>
            ) : (
              <>
                <div>
                  <Link
                    to={`/view/${catId}/subject/${sub._id}`}
                    className="fw-bold"
                    style={{ fontSize: 17 }}
                  >
                    {sub.locked ? '🔒 ' : ''}
                    {sub.title}
                  </Link>
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    {ownerName(sub.owner) && (
                      <>
                        {t('forum.by')}
                        {ownerName(sub.owner)} ·{' '}
                      </>
                    )}
                    {formatDate(sub.modified ?? sub.created)}
                  </div>
                </div>
                {canPublish && (
                <div className="d-flex gap-8">
                  <button
                    type="button"
                    className="btn btn-link p-0"
                    onClick={() => lockMut.mutate({ subId: sub._id, title: sub.title, locked: !sub.locked })}
                  >
                    {sub.locked ? t('forum.subject.unlock', { defaultValue: 'Déverrouiller' }) : t('forum.subject.lock', { defaultValue: 'Verrouiller' })}
                  </button>
                  <button
                    type="button"
                    className="btn btn-link p-0"
                    onClick={() => {
                      setSubTitle(sub.title);
                      setEditingSub(sub._id);
                    }}
                  >
                    {t('forum.subject.edit.title', { defaultValue: 'Renommer le sujet' })}
                  </button>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-danger"
                    onClick={() => {
                      if (
                        window.confirm(
                          t('forum.confirm.delete.subject', { defaultValue: 'Supprimer cette discussion ?' }),
                        )
                      )
                        deleteSubjectMut.mutate(sub._id);
                    }}
                  >
                    {t('forum.delete', { defaultValue: 'Supprimer' })}
                  </button>
                </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Category;
