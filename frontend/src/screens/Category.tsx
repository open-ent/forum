import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { api } from '../api';
import { formatDate, ownerName } from '../utils';

/** Écran catégorie : liste des sujets + création d'un sujet. */
export function Category() {
  const { catId = '' } = useParams();
  const { t } = useTranslation(['forum', 'common']);
  const qc = useQueryClient();

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
  const createMut = useMutation({
    mutationFn: () => api.createSubject(catId, { title: title.trim() }),
    onSuccess: () => {
      setTitle('');
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
    if (title.trim()) createMut.mutate();
  };

  const subjects = subjectsQuery.data ?? [];

  return (
    <div>
      <p>
        <Link to="/">← {t('forum.back.to.categories')}</Link>
      </p>
      <div className="d-flex align-items-center justify-content-between mb-16">
        <h1 className="m-0">{categoryQuery.data?.name ?? t('forum.category')}</h1>
        {!creating && (
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            {t('forum.subject.new', { defaultValue: 'Nouveau sujet' })}
          </button>
        )}
      </div>

      {creating && (
        <form className="d-flex gap-8 mb-16" onSubmit={onSubmit}>
          <input
            type="text"
            className="form-control"
            style={{ maxWidth: 420 }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('forum.subject.placeholder', { defaultValue: 'Titre du sujet' })}
            aria-label={t('forum.subject.new', { defaultValue: 'Nouveau sujet' })}
            autoFocus
          />
          <button type="submit" className="btn btn-primary" disabled={!title.trim() || createMut.isPending}>
            {t('forum.category.edit.finish')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setCreating(false)}>
            {t('forum.category.share.return')}
          </button>
        </form>
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
            <div>
              <Link
                to={`/view/${catId}/subject/${sub._id}`}
                className="fw-bold"
                style={{ fontSize: 17 }}
              >
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
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Category;
