import { Editor, EditorRef } from '@open-ent/react/editor';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { api } from '../api';
import { formatDate, ownerName } from '../utils';

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

  // Éditeur de réponse (non contrôlé, lu via ref). On le remonte via `replyKey`
  // après envoi pour repartir d'un contenu vide.
  const replyRef = useRef<EditorRef>(null);
  const [replyKey, setReplyKey] = useState(0);
  const [replyEmpty, setReplyEmpty] = useState(true);
  const replyMut = useMutation({
    mutationFn: () => {
      const content = (replyRef.current?.getContent('html') as string) ?? '';
      return api.postMessage(catId, subId, { content });
    },
    onSuccess: () => {
      setReplyKey((k) => k + 1);
      setReplyEmpty(true);
      invalidate();
    },
  });

  // Éditeur d'édition (monté seulement pour le message en cours d'édition).
  const editRef = useRef<EditorRef>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const editMut = useMutation({
    mutationFn: (msgId: string) => {
      const content = (editRef.current?.getContent('html') as string) ?? '';
      return api.updateMessage(catId, subId, msgId, { content });
    },
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
    if (!replyEmpty) replyMut.mutate();
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
                    onClick={() => setEditing(msg._id)}
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
                <Editor
                  id={`forum-edit-${msg._id}`}
                  ref={editRef}
                  content={msg.content ?? ''}
                  mode="edit"
                  visibility="protected"
                />
                <div className="d-flex gap-8 mt-8">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={editMut.isPending}
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
              <Editor content={msg.content ?? ''} mode="read" variant="ghost" />
            )}
          </li>
        ))}
      </ul>

      {/* Répondre au sujet */}
      <form onSubmit={onReply}>
        <label htmlFor="forum-reply" className="fw-bold d-block mb-8">
          {t('forum.reply', { defaultValue: 'Répondre' })}
        </label>
        <div className="mb-8">
          <Editor
            key={replyKey}
            id="forum-reply"
            ref={replyRef}
            content=""
            mode="edit"
            visibility="protected"
            onContentChange={({ editor }) => setReplyEmpty(editor.isEmpty)}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={replyEmpty || replyMut.isPending}>
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
