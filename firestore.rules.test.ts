/**
 * Security Rule Verification Blueprint — Veredito
 * Documents the 12 adversarial ("Dirty Dozen") assertions enforced by firestore.rules.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'list' | 'get' | 'create' | 'update' | 'delete';
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
  enforcedBy: string;
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated List Read on /games',
    collection: '/games',
    operation: 'list',
    auth: null,
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isSignedIn() && resource.data.visibility == "group"',
  },
  {
    id: 2,
    name: 'Unverified Email Create on /games',
    collection: '/games/game_1',
    operation: 'create',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: false },
    payload: { title: 'Test' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isVerified()',
  },
  {
    id: 3,
    name: 'PII Field Injection on /users/{uid}',
    collection: '/users/userA',
    operation: 'create',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: { uid: 'userA', displayName: 'Alex', email: 'a@example.com', visibility: 'group' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isValidUserProfile -> keys().hasOnly([...])',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on /games/{gameId}',
    collection: '/games/game_1',
    operation: 'create',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: { title: 'Game', isVerified: true },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isValidGame -> keys().hasOnly([...])',
  },
  {
    id: 5,
    name: 'Identity Spoofing on /reviews/{reviewId}',
    collection: '/reviews/game_1_userB',
    operation: 'create',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: { gameId: 'game_1', authorId: 'userB', score: 90 },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isValidReview -> data.authorId == request.auth.uid',
  },
  {
    id: 6,
    name: 'Duplicate Review Vote Stuffing via Arbitrary ID',
    collection: '/reviews/arbitrary_id_99',
    operation: 'create',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: { gameId: 'game_1', authorId: 'userA', score: 100 },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'reviewId == incoming().gameId + "_" + request.auth.uid',
  },
  {
    id: 7,
    name: 'Orphan Review Referencing Non-Existent Game',
    collection: '/reviews/missing_game_userA',
    operation: 'create',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: { gameId: 'missing_game', authorId: 'userA', score: 85 },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'exists(/databases/$(database)/documents/games/$(incoming().gameId))',
  },
  {
    id: 8,
    name: 'Score Out-of-Bounds / Type Poisoning on Update',
    collection: '/reviews/game_1_userA',
    operation: 'update',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: { score: 150 },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isValidReview -> data.score is int && data.score >= 0 && data.score <= 100',
  },
  {
    id: 9,
    name: 'Immutable Field Tampering (createdAt / authorId)',
    collection: '/reviews/game_1_userA',
    operation: 'update',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: { authorId: 'userB', createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'affectedKeys().hasOnly([...]) && incoming().createdAt == existing().createdAt',
  },
  {
    id: 10,
    name: 'Cross-User Review Deletion',
    collection: '/reviews/game_1_userA',
    operation: 'delete',
    auth: { uid: 'userB', email: 'b@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'existing().authorId == request.auth.uid || isAdmin()',
  },
  {
    id: 11,
    name: 'Path Variable Poisoning on /games/{gameId}',
    collection: '/games/invalid$$id',
    operation: 'create',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: { title: 'Poison' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isValidId(gameId)',
  },
  {
    id: 12,
    name: 'Admin Email Spoofing Without email_verified',
    collection: '/reviews/game_1_userA',
    operation: 'delete',
    auth: { uid: 'attacker', email: 'kaorurou@gmail.com', email_verified: false },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isAdmin() -> request.auth.token.email_verified == true',
  },
];
