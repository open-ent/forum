import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { api } from '../api';
import { formatDate, ownerName } from '../utils';

/** Texte -> HTML simple (le contenu message est stocké en HTML). */
function toHtml(s: string): string {
  const esc = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<p>${esc.replace(/\n/g, '<br />')}</p>`;
}

/** Écran sujet : fil de messages + réponse + édition/suppression de message. */
export function Subject() {
  const { catId = '', subId = '' } = useParams();
  const { t } = useTranslation(['forum', 'common']);
  const qc = useQueryClient();
  const messagesKey = ['forum', 'category', catId, 'subject', subId, 'messages'];

  const messagesQuery = useQuery({
    queryKey: messagesKey,
    queryFn: () => api.getMessages(catId, subId),
    enabled: !!catId && !!subId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: messagesKey });

  const [reply, setReply] = useState('');
  const replyMut = useMutation({
    mutationFn: () => api.postMessage(catId, subId, { content: toHtml(reply.trim()) }),
    onSuccess: () => {
      setReply('');
      invalidate();
    },
  });

  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const editMut = useMutation({
    mutationFn: (msgId: string) => api.updateMessage(catId, subId, msgId, { content: toHtml(editText.trim()) }),
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
  });
  const deleteMut = useMutation({
    mutationFn: (msgId: string) => api.deleteMessage(catId, subId, msgId),
    onSuccess: invalidate,
  });

  const onReply = (e: FormEvent) => {
    e.preventDefault();
    if (reply.trim()) replyMut.mutate();
  };

  const messages = messagesQuery.data ?? [];

  return (
    <div>
      <p>
        <Link to={`/view/${catId}`}>← {t('forum.back.to.subjects')}</Link>
      </p>

      {messagesQuery.isLoading && <p>{t('forum.loading', { defaultValue: 'Chargement…' })}</p>}
      {messagesQuery.isError && (
        <div className="alert alert-warning" role="alert">
          {t('forum.error', { defaultValue: 'Une erreur est survenue.' })}
        </div>
      )}
      {!messagesQuery.isLoading && messages.length === 0 && (
        <p className="text-muted">
          {t('forum.no.messages', { defaultValue: 'Aucun message dans ce sujet.' })}
        </p>
      )}

      <ul className="list-unstyled mb-24">
        {messages.map((msg) => (
          <li key={msg._id} className="py-12 border-bottom">
            <div className="d-flex justify-content-between align-items-start">
              <div className="text-muted mb-4" style={{ fontSize: 13 }}>
                {ownerName(msg.owner) && <strong>{ownerName(msg.owner)}</strong>}
                {' · '}
                {formatDate(msg.modified ?? msg.created)}
              </div>
              {editing !== msg._id && (
                <div className="d-flex gap-8">
                  <button
                    type="button"
                    className="btn btn-link p-0"
                    onClick={() => {
                      // repart du texte brut (sans balises) pour l'édition
                      const div = document.createElement('div');
                      div.innerHTML = msg.content ?? '';
                      setEditText(div.textContent ?? '');
                      setEditing(msg._id);
                    }}
                  >
                    {t('forum.subject.edit', { defaultValue: 'Modifier' })}
                  </button>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-danger"
                    onClick={() => {
                      if (window.confirm(t('forum.confirm.delete.message', { defaultValue: 'Supprimer ce message ?' })))
                        deleteMut.mutate(msg._id);
                    }}
                  >
                    {t('forum.delete', { defaultValue: 'Supprimer' })}
                  </button>
                </div>
              )}
            </div>

            {editing === msg._id ? (
              <div>
                <textarea
                  className="form-control mb-8"
                  rows={3}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                />
                <div className="d-flex gap-8">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!editText.trim() || editMut.isPending}
                    onClick={() => editMut.mutate(msg._id)}
                  >
                    {t('forum.category.edit.finish')}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>
                    {t('forum.category.share.return')}
                  </button>
                </div>
              </div>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: msg.content ?? '' }} />
            )}
          </li>
        ))}
      </ul>

      {/* Répondre au sujet */}
      <form onSubmit={onReply}>
        <label htmlFor="forum-reply" className="fw-bold d-block mb-8">
          {t('forum.reply', { defaultValue: 'Répondre' })}
        </label>
        <textarea
          id="forum-reply"
          className="form-control mb-8"
          rows={3}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={t('forum.subject.message', { defaultValue: 'Votre message…' })}
        />
        <button type="submit" className="btn btn-primary" disabled={!reply.trim() || replyMut.isPending}>
          {t('forum.reply', { defaultValue: 'Répondre' })}
        </button>
        {(replyMut.isError || editMut.isError || deleteMut.isError) && (
          <div className="alert alert-warning mt-8" role="alert">
            {t('forum.error', { defaultValue: 'Une erreur est survenue.' })}
          </div>
        )}
      </form>
    </div>
  );
}

export default Subject;
