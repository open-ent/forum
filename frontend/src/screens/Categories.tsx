import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { api } from '../api';
import { formatDate, ownerName } from '../utils';

/** Écran d'accueil : liste des catégories + création d'une catégorie. */
export function Categories() {
  const { t } = useTranslation(['forum', 'common']);
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['forum', 'categories'],
    queryFn: api.getCategories,
  });

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const createMut = useMutation({
    mutationFn: () => api.createCategory({ name: name.trim() }),
    onSuccess: () => {
      setName('');
      setCreating(false);
      qc.invalidateQueries({ queryKey: ['forum', 'categories'] });
    },
  });
  const deleteMut = useMutation({
    mutationFn: (catId: string) => api.deleteCategory(catId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forum', 'categories'] }),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) createMut.mutate();
  };

  const categories = data ?? [];

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-16">
        <h1 className="m-0">{t('forum.title')}</h1>
        {!creating && (
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            {t('forum.category.new')}
          </button>
        )}
      </div>

      {creating && (
        <form className="d-flex gap-8 mb-16" onSubmit={onSubmit}>
          <input
            type="text"
            className="form-control"
            style={{ maxWidth: 360 }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('forum.category.name', { defaultValue: 'Nom de la catégorie' })}
            aria-label={t('forum.category.new')}
            autoFocus
          />
          <button type="submit" className="btn btn-primary" disabled={!name.trim() || createMut.isPending}>
            {t('forum.category.edit.finish')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setCreating(false)}>
            {t('forum.category.share.return')}
          </button>
        </form>
      )}
      {createMut.isError && (
        <div className="alert alert-warning" role="alert">
          {t('forum.error', { defaultValue: 'Une erreur est survenue.' })}
        </div>
      )}

      {isLoading && <p>{t('forum.loading', { defaultValue: 'Chargement…' })}</p>}
      {isError && (
        <div className="alert alert-warning" role="alert">
          {t('forum.error', { defaultValue: 'Une erreur est survenue.' })}
        </div>
      )}
      {!isLoading && !isError && categories.length === 0 && (
        <p className="text-muted">
          {t('forum.no.categories', { defaultValue: 'Aucune catégorie pour le moment.' })}
        </p>
      )}

      <ul className="list-unstyled">
        {categories.map((cat) => (
          <li key={cat._id} className="py-12 border-bottom d-flex justify-content-between align-items-start">
            <div>
              <Link to={`/view/${cat._id}`} className="fw-bold" style={{ fontSize: 18 }}>
                {cat.name}
              </Link>
              <div className="text-muted" style={{ fontSize: 13 }}>
                {ownerName(cat.owner) && (
                  <>
                    {t('forum.by')}
                    {ownerName(cat.owner)} ·{' '}
                  </>
                )}
                {formatDate(cat.modified ?? cat.created)}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-link p-0 text-danger"
              onClick={() => {
                if (
                  window.confirm(
                    t('forum.confirm.delete.category', { defaultValue: 'Supprimer cette catégorie ?' }),
                  )
                )
                  deleteMut.mutate(cat._id);
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

export default Categories;
