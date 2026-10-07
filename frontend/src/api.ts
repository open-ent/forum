// Client REST du module Forum (cookies de session ENT, même origine).
// Mêmes endpoints que la version AngularJS (backend Java inchangé).

export interface Category {
  _id: string;
  name: string;
  icon?: string;
  owner?: { userId: string; displayName: string };
  modified?: { $date: string } | string;
  created?: { $date: string } | string;
  nbSubjects?: number;
}

export interface Subject {
  _id: string;
  title: string;
  owner?: { userId: string; displayName: string };
  modified?: { $date: string } | string;
  created?: { $date: string } | string;
  nbMessages?: number;
}

export interface Message {
  _id: string;
  content: string;
  owner?: { userId: string; displayName: string };
  modified?: { $date: string } | string;
  created?: { $date: string } | string;
}

// ── Partage (modèle entcore classique) ──────────────────────────────────────
/** Un niveau de droit (ex. `category.read`) et la liste d'actions concrètes qu'il couvre. */
export interface ShareAction {
  name: string[];
  displayName: string;
  type: string;
}
export interface ShareGroup {
  id: string;
  name: string;
  groupDisplayName?: string | null;
  structureName?: string | null;
}
export interface ShareUser {
  id: string;
  username: string;
  login?: string;
  profile?: string;
}
/** Réponse de `GET /forum/share/json/:id`. `checked` = id -> actions concrètes accordées. */
export interface ShareJson {
  actions: ShareAction[];
  groups: { visibles: ShareGroup[]; checked: Record<string, string[]> };
  users: { visibles: ShareUser[]; checked: Record<string, string[]> };
}
/** Corps de `PUT /forum/share/resource/:id` (batch). */
export interface ShareBatch {
  users: Record<string, string[]>;
  groups: Record<string, string[]>;
  bookmarks: Record<string, string[]>;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(String(res.status));
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

const base = { credentials: 'include' as const };
const jsonHeaders = { 'Content-Type': 'application/json' };

// ── Lecture ────────────────────────────────────────────────────────────────
export const getCategories = async (): Promise<Category[]> =>
  json<Category[]>(await fetch('/forum/categories', base));

export const getCategory = async (catId: string): Promise<Category> =>
  json<Category>(await fetch(`/forum/category/${catId}`, base));

export const getSubjects = async (catId: string): Promise<Subject[]> =>
  json<Subject[]>(await fetch(`/forum/category/${catId}/subjects`, base));

export const getMessages = async (catId: string, subId: string): Promise<Message[]> =>
  json<Message[]>(await fetch(`/forum/category/${catId}/subject/${subId}/messages`, base));

// ── Écriture (pour les incréments suivants) ─────────────────────────────────
export const createCategory = async (data: Partial<Category>): Promise<Category> =>
  json<Category>(
    await fetch('/forum/categories', { ...base, method: 'POST', headers: jsonHeaders, body: JSON.stringify(data) }),
  );

export const createSubject = async (catId: string, data: Partial<Subject>): Promise<Subject> =>
  json<Subject>(
    await fetch(`/forum/category/${catId}/subjects`, {
      ...base,
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(data),
    }),
  );

export const postMessage = async (
  catId: string,
  subId: string,
  data: Partial<Message>,
): Promise<Message> =>
  json<Message>(
    await fetch(`/forum/category/${catId}/subject/${subId}/messages`, {
      ...base,
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(data),
    }),
  );

// ── Édition / suppression ───────────────────────────────────────────────────
export const updateCategory = async (catId: string, data: Partial<Category>): Promise<Category> =>
  json<Category>(
    await fetch(`/forum/category/${catId}`, {
      ...base,
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(data),
    }),
  );

export const deleteCategory = async (catId: string): Promise<void> => {
  await fetch(`/forum/category/${catId}`, { ...base, method: 'DELETE' });
};

export const updateSubject = async (
  catId: string,
  subId: string,
  data: Partial<Subject>,
): Promise<Subject> =>
  json<Subject>(
    await fetch(`/forum/category/${catId}/subject/${subId}`, {
      ...base,
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(data),
    }),
  );

export const deleteSubject = async (catId: string, subId: string): Promise<void> => {
  await fetch(`/forum/category/${catId}/subject/${subId}`, { ...base, method: 'DELETE' });
};

export const updateMessage = async (
  catId: string,
  subId: string,
  msgId: string,
  data: Partial<Message>,
): Promise<Message> =>
  json<Message>(
    await fetch(`/forum/category/${catId}/subject/${subId}/message/${msgId}`, {
      ...base,
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(data),
    }),
  );

export const deleteMessage = async (
  catId: string,
  subId: string,
  msgId: string,
): Promise<void> => {
  await fetch(`/forum/category/${catId}/subject/${subId}/message/${msgId}`, {
    ...base,
    method: 'DELETE',
  });
};

export const getShare = async (catId: string): Promise<ShareJson> =>
  json<ShareJson>(await fetch(`/forum/share/json/${catId}`, base));

export const shareResource = async (catId: string, batch: ShareBatch): Promise<void> => {
  const res = await fetch(`/forum/share/resource/${catId}`, {
    ...base,
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(batch),
  });
  if (!res.ok) throw new Error(String(res.status));
};

export const api = {
  getCategories,
  getCategory,
  getSubjects,
  getMessages,
  createCategory,
  createSubject,
  postMessage,
  updateCategory,
  deleteCategory,
  updateSubject,
  deleteSubject,
  updateMessage,
  deleteMessage,
  getShare,
  shareResource,
};
