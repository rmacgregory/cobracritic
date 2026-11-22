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
   - A `ReviewComment` cannot be created unless `/reviews/{reviewId}` exists.
   - A `ReviewReaction` cannot be created unless `/reviews/{reviewId}` exists, and enforces `reactionId == incoming().reviewId + '_' + request.auth.uid`.
7. **Identity & Temporal Integrity**:
   - Creator/author UIDs (`uid`, `createdBy`, `authorId`, `userId`, `grantedBy`, `bannedBy`) must equal `request.auth.uid` on create and remain immutable on update.
   - `createdAt` must equal `request.time` on create and remain immutable on update; `updatedAt` must equal `request.time` on create and update.
8. **Strict Schema & Size Guards**: Every string has explicit `.size()` bounds; arrays (`platforms`, `genres`, `topFiveGames`) are bounded and element-checked; `score` is strictly an integer in `[0, 100]`; `releaseDate` matches `^[0-9]{4}-[0-9]{2}-[0-9]{2}$`.
9. **Secure List Queries**: Every `allow list` rule evaluates `resource.data.visibility == 'group'` directly without any `get()` or `exists()` lookups.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated List Read**: Unauthenticated client lists `/games` -> `PERMISSION_DENIED`.
2. **Unverified Email Write**: Authenticated non-admin user with `email_verified: false` creates `/games/g1` -> `PERMISSION_DENIED`.
3. **Self-Promotion Attack**: Non-admin user creates `/admins/{selfUid}` with `role: "admin"` -> `PERMISSION_DENIED`.
4. **Banned User Bypass Write**: User listed in `/bans/{uid}` attempts to create `/reviews/g1_{uid}` or `/comments/c1` -> `PERMISSION_DENIED`.
5. **Non-Admin Ban Attempt**: Regular user attempts to create `/bans/victimUid` or delete `/bans/{selfUid}` -> `PERMISSION_DENIED`.
6. **Admin Self-Ban / Peer-Admin Ban**: Admin attempts to ban themselves or another active admin without revoking admin first -> `PERMISSION_DENIED`.
7. **PII Injection on Profile**: User creates `/users/{uid}` containing `email: "leak@test.com"` -> `PERMISSION_DENIED` (blocked by `hasOnly`).
8. **Shadow Field Injection on Game**: User creates `/games/g1` with extra `isOfficial: true` -> `PERMISSION_DENIED` (blocked by `hasOnly`).
9. **Identity Spoofing on Review**: User A creates `/reviews/g1_userB` with `authorId: "userB"` -> `PERMISSION_DENIED`.
10. **Vote Stuffing (Non-Deterministic Review ID)**: User A creates `/reviews/custom_id_123` for `gameId: "g1"` -> `PERMISSION_DENIED`.
11. **Score Range / Type Poisoning**: User A updates `/reviews/g1_userA` with `score: 999` or `score: "100"` -> `PERMISSION_DENIED`.
12. **Admin Email Spoofing**: Non-admin user with `email: "kaorurou@gmail.com"` and `email_verified: false` attempts to grant admin or delete another user's review -> `PERMISSION_DENIED`.
