# Security Specification — Veredito (Firestore Rules)

## 1. Data Invariants
1. **No Unauthenticated Access**: Every collection requires an authenticated user (`request.auth != null`), and all writes require a verified email (`request.auth.token.email_verified == true`).
2. **PII Isolation**: `/users/{userId}` stores strictly non-PII public profile fields (`uid`, `displayName`, `photoURL`, `bio`, `favoriteGenre`, `visibility`, `createdAt`, `updatedAt`). Email, phone, and address fields are prohibited by `hasOnly(...)`.
3. **One Review Per Friend Per Game**: `/reviews/{reviewId}` enforces `reviewId == incoming().gameId + '_' + request.auth.uid`, preventing duplicate rating manipulation of the group's average score.
4. **Referential Integrity (Global Consistency)**:
   - A `Review` cannot be created unless `/games/{gameId}` exists.
   - A `ReviewComment` cannot be created unless `/reviews/{reviewId}` exists.
   - A `ReviewReaction` cannot be created unless `/reviews/{reviewId}` exists, and enforces `reactionId == incoming().reviewId + '_' + request.auth.uid`.
5. **Identity & Temporal Integrity**:
   - Creator/author UIDs (`uid`, `createdBy`, `authorId`, `userId`) must equal `request.auth.uid` on create and remain immutable on update.
   - `createdAt` must equal `request.time` on create and remain immutable on update; `updatedAt` must equal `request.time` on create and update.
6. **Strict Schema & Size Guards**: Every string has explicit `.size()` bounds; arrays (`platforms`, `genres`) are bounded and element-checked; `score` is strictly an integer in `[0, 100]`; `releaseDate` matches `^[0-9]{4}-[0-9]{2}-[0-9]{2}$`.
7. **Secure List Queries**: Every `allow list` rule evaluates `resource.data.visibility == 'group'` directly without any `get()` or `exists()` lookups.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated List Read**: Unauthenticated client lists `/games` -> `PERMISSION_DENIED`.
2. **Unverified Email Write**: Authenticated user with `email_verified: false` creates `/games/g1` -> `PERMISSION_DENIED`.
3. **PII Injection on Profile**: User creates `/users/{uid}` containing `email: "leak@test.com"` -> `PERMISSION_DENIED` (blocked by `hasOnly`).
4. **Shadow Field Injection on Game**: User creates `/games/g1` with extra `isOfficial: true` -> `PERMISSION_DENIED` (blocked by `hasOnly`).
5. **Identity Spoofing on Review**: User A creates `/reviews/g1_userB` with `authorId: "userB"` -> `PERMISSION_DENIED`.
6. **Vote Stuffing (Non-Deterministic Review ID)**: User A creates `/reviews/custom_id_123` for `gameId: "g1"` -> `PERMISSION_DENIED`.
7. **Orphan Review Creation**: User A creates `/reviews/nonexistent_userA` pointing to non-existent `/games/nonexistent` -> `PERMISSION_DENIED`.
8. **Score Range Poisoning**: User A updates `/reviews/g1_userA` with `score: 999` or `score: "100"` -> `PERMISSION_DENIED`.
9. **Immutable Timestamp Tampering**: User A updates `/reviews/g1_userA` modifying `createdAt` or `authorId` -> `PERMISSION_DENIED`.
10. **Cross-User Review Deletion**: User B deletes User A's `/reviews/g1_userA` (not admin) -> `PERMISSION_DENIED`.
11. **Path Variable Poisoning**: User A writes `/games/bad..id$with/chars` -> `PERMISSION_DENIED` (`isValidId`).
12. **Admin Email Spoofing**: Non-admin user with `email: "kaorurou@gmail.com"` and `email_verified: false` attempts to delete another user's review -> `PERMISSION_DENIED`.
