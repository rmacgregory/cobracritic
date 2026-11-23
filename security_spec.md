# Security Specification — CobraCritic (Firestore Rules)

## 1. Data Invariants
1. **No Unauthenticated Access**: Every collection requires an authenticated user (`request.auth != null`). Standard writes require a verified email (`request.auth.token.email_verified == true`) or an explicitly granted admin record in `/admins/{uid}`, and strictly require that the actor is NOT banned (`!exists(/databases/$(database)/documents/bans/$(request.auth.uid))`).
2. **PII Isolation**: `/users/{userId}` stores strictly non-PII public profile fields (`uid`, `displayName`, `photoURL`, `bio`, `topFiveGames`, `visibility`, `createdAt`, `updatedAt`). Email, phone, and address fields are prohibited by `hasOnly(...)`.
3. **RBAC Privilege Isolation (`/admins/{userId}`)**:
   - Only `isAdmin()` (verified Master Admin `kaorurou@gmail.com` or an existing UID in `/admins/{uid}` that is not banned) may create or delete `/admins/{userId}` grants.
   - Regular users can NEVER self-promote into `/admins/{uid}` or write RBAC fields onto `/users/{uid}`.
   - Admins cannot revoke their own admin document (`userId != request.auth.uid`).
4. **Moderation Ban Enforcement (`/bans/{userId}`)**:
   - Only `isAdmin()` may create or delete `/bans/{userId}`.
   - Admins cannot ban themselves (`userId != request.auth.uid`) and cannot ban an active admin (`!exists(/databases/$(database)/documents/admins/$(userId))`).
   - Once banned, a user is immediately blocked from creating, updating, or deleting any `/games`, `/reviews`, `/comments`, `/reactions`, or `/users` documents at the Firestore rules level.
5. **One Review Per Friend Per Game**: `/reviews/{reviewId}` enforces `reviewId == incoming().gameId + '_' + request.auth.uid`, preventing duplicate rating manipulation of the group's average score.
6. **Referential Integrity (Global Consistency)**:
   - A `Review` cannot be created unless `/games/{gameId}` exists.
   - A `ReviewComment` cannot be created unless `/reviews/{reviewId}` exists, and if `parentCommentId` is set, `/comments/{parentCommentId}` must exist and belong to the same `reviewId`.
   - A `ReviewReaction` cannot be created unless `/reviews/{reviewId}` exists, and enforces `reactionId == incoming().reviewId + '_' + request.auth.uid`.
7. **Identity & Temporal Integrity**:
   - Creator/author UIDs (`uid`, `createdBy`, `authorId`, `userId`, `grantedBy`, `bannedBy`) must equal `request.auth.uid` on create and remain immutable on update.
   - `createdAt` must equal `request.time` on create and remain immutable on update; `updatedAt` must equal `request.time` on create and update.
8. **Strict Schema & Size Guards**: Every string has explicit `.size()` bounds; arrays (`platforms`, `genres`, `topFiveGames`) are bounded and element-checked; `score` is strictly an integer in `[0, 100]`; `releaseDate` matches `^[0-9]{4}-[0-9]{2}-[0-9]{2}$`.
9. **Secure List Queries**: Every `allow list` rule evaluates `resource.data.visibility == 'group'` directly without any `get()` or `exists()` lookups.
10. **Events Admin Governance (`/events/{eventId}`)**:
    - Only `isAdmin()` may create, update, toggle active/inactive, manage categories/nominees, declare winners (`status: 'closed'`), or delete events.
    - Non-admin members can read group events (`visibility == 'group'`) but can never mutate event state or winners.
11. **Public Single-Vote-Per-Category & Active Gate (`/eventVotes/{voteId}`)**:
    - Deterministic ID `voteId == incoming().eventId + '_' + incoming().categoryId + '_' + request.auth.uid` enforces strictly one vote per member per category.
    - All signed-in group members can read votes (`visibility == 'group'`) so votes are visible to everyone.
    - Members can only create, change, or remove their vote while `/events/{eventId}` exists AND its `status == 'active'`; once `'inactive'` or `'closed'`, voting is locked at the Firestore rules level.
12. **Rating-Only Reviews (`/reviews/{reviewId}`)**:
    - `ratingOnly` is an optional boolean field. When `ratingOnly == true`, `headline` and `body` must be empty strings (`''`). When `ratingOnly` is `false` or absent, `headline` must be `2..140` chars and `body` must be `10..4000` chars.
13. **Cover Art Reports (`/coverReports/{reportId}`)**:
    - Deterministic ID `reportId == incoming().gameId + '_' + request.auth.uid` prevents duplicate spam per member per game, and requires parent `/games/{gameId}` to exist on create.
    - Members can only submit reports with `status == 'open'` and `reporterId == request.auth.uid`.
    - Only `isAdmin()` can resolve (`status: 'resolved'`) or delete cover reports.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated List Read**: Unauthenticated client lists `/games`, `/events`, or `/coverReports` -> `PERMISSION_DENIED`.
2. **Unverified Email Write**: Authenticated non-admin user with `email_verified: false` creates `/games/g1`, `/eventVotes/e1_c1_u1`, or `/coverReports/g1_u1` -> `PERMISSION_DENIED`.
3. **Self-Promotion Attack**: Non-admin user creates `/admins/{selfUid}` with `role: "admin"` -> `PERMISSION_DENIED`.
4. **Banned User Bypass Write**: User listed in `/bans/{uid}` attempts to create `/reviews/g1_{uid}`, `/comments/c1`, `/eventVotes/e1_c1_{uid}`, or `/coverReports/g1_{uid}` -> `PERMISSION_DENIED`.
5. **Non-Admin Event or Report Resolution Manipulation**: Regular user attempts to create `/events/e1`, set `winnerNomineeId`, or mark `/coverReports/g1_u2` as `status: "resolved"` -> `PERMISSION_DENIED`.
6. **Post-Closure Vote Tampering**: Regular user attempts to create, update, or delete `/eventVotes/e1_c1_{uid}` after `/events/e1` is `'closed'` or `'inactive'` -> `PERMISSION_DENIED`.
7. **PII Injection on Profile**: User creates `/users/{uid}` containing `email: "leak@test.com"` -> `PERMISSION_DENIED` (blocked by `hasOnly`).
8. **Shadow Field Injection on Event / CoverReport**: User creates `/coverReports/g1_{uid}` with extra `isAdminRead: true` -> `PERMISSION_DENIED` (blocked by `hasOnly`).
9. **Identity Spoofing on CoverReport / Vote**: User A creates `/coverReports/g1_userB` with `reporterId: "userB"` -> `PERMISSION_DENIED`.
10. **Orphaned CoverReport / Non-Deterministic ID**: User A creates `/coverReports/random_id` or references a non-existent `gameId` -> `PERMISSION_DENIED`.
11. **Malformed Rating-Only Review**: User creates `/reviews/g1_{uid}` with `ratingOnly: false` and empty `body: ""` OR `ratingOnly: true` with non-empty `body: "spam"` -> `PERMISSION_DENIED`.
12. **Admin Email Spoofing**: Non-admin user with `email: "kaorurou@gmail.com"` and `email_verified: false` attempts to grant admin, resolve a cover report, or close an event -> `PERMISSION_DENIED`.
