import { describe, expect, it } from 'vitest';

import { canEditMessage, FORUM_RIGHT_ACTIONS, hasForumRight } from './rights';

const me = { userId: 'u1', groupsIds: ['g1'] };

describe('hasForumRight', () => {
  it('le propriétaire a tous les droits', () => {
    expect(hasForumRight({ owner: { userId: 'u1' } }, me, 'manager')).toBe(true);
  });
  it('partage direct ou par groupe', () => {
    const cat = { owner: { userId: 'x' }, shared: [{ groupId: 'g1', [FORUM_RIGHT_ACTIONS.contrib]: true }, { userId: 'u1', [FORUM_RIGHT_ACTIONS.publish]: true }] };
    expect(hasForumRight(cat, me, 'contrib')).toBe(true);
    expect(hasForumRight(cat, me, 'publish')).toBe(true);
    expect(hasForumRight(cat, me, 'manager')).toBe(false);
  });
  it('lecteur simple : aucun droit d\'écriture', () => {
    expect(hasForumRight({ owner: { userId: 'x' }, shared: [{ userId: 'u1' }] }, me, 'contrib')).toBe(false);
    expect(hasForumRight(undefined, me, 'contrib')).toBe(false);
  });
});

describe('canEditMessage', () => {
  const contribCat = { owner: { userId: 'x' }, shared: [{ userId: 'u1', [FORUM_RIGHT_ACTIONS.contrib]: true }] };
  it('l\'auteur contributeur modifie son message, pas celui d\'un autre', () => {
    expect(canEditMessage(contribCat, me, { owner: { userId: 'u1' } })).toBe(true);
    expect(canEditMessage(contribCat, me, { owner: { userId: 'z' } })).toBe(false);
  });
  it('le droit « publish » permet de modérer tous les messages', () => {
    const cat = { owner: { userId: 'x' }, shared: [{ userId: 'u1', [FORUM_RIGHT_ACTIONS.publish]: true }] };
    expect(canEditMessage(cat, me, { owner: { userId: 'z' } })).toBe(true);
  });
});
