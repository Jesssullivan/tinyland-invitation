# Changelog

## 0.4.0

Reconciles the reviewed `candidate/nonprod-20260924-170b52743ef9` lineage (the
invitation source the Mothership writer image already builds through
`--override_module`) onto 0.3.0, so consumers can resolve it from the registry
(TIN-3692 RU11). There is no dependency, peer, engine or export change, but
it is not a drop-in update for legacy (non-durable) acceptance: that path now
needs a consumer hook, an existing user file and canonical handles. See
[Migrating from 0.3.0](#migrating-from-030).

- `InvitationConfig.durableAcceptance` (optional, single-process, file-native
  acceptance journal), `InvitationService.recoverPendingAcceptances()` and
  `AcceptResult.replayed`. Replay never restores old user security state and
  omits user and temporary-factor material.
- Legacy (non-durable) acceptance is gated by the consumer: `acceptInvitation`
  requires the new optional `InvitationConfig.canAcceptInvitation` hook and,
  without it, refuses before reading, claiming or writing anything. The hook is
  asked before the token claim and again after password hashing, on the
  pre-claim invitation snapshot. Durable mode keeps using
  `durableAcceptance.canAcceptInvitation`.
- In both modes a missing, unreadable or corrupt user file (not a JSON array,
  an entry without `id`/`handle`, duplicate ids or case-insensitive handles)
  fails closed. It is never read as an empty list, so no acceptance can rewrite
  `admin-users.json` without the established accounts. Legacy mode re-reads the
  users after hashing and writes only from that successful read.
- Both modes accept only canonical handles (already trimmed and lowercase,
  `^[a-z0-9][a-z0-9_-]*$`). Legacy mode refuses any other handle with
  `Invalid handle` before any read, hook call, claim or write. It reserves
  existing handles and username aliases case-insensitively before the claim
  and again after hashing, and refuses a generated user id that already exists.
  So neither mode writes a user file that its own strict reader rejects.
- Inactive invitations are excluded from pending lookup, acceptance and the
  pending list (both modes).
- Both modes reserve legacy username aliases. Committed issuance is reported
  truthfully even if the audit sink fails (both modes).
- The new acceptance and expiry paths read the internal `seams.ts` clock that
  0.3.0 introduced (system time unless the NODE_ENV=test testing build installs
  a clock); no public clock option is added.
- Release surface follows 0.3.0 (validation-only `ci.yml`, `publishable =
  False`, no publish hooks) plus `//:package_artifact_test` on the real
  `//:pkg`. The candidate's inert GF v4 lane file and its workflow-absence
  contract test are not carried over; the inert plan documents stay.

### Migrating from 0.3.0

There is no dependency, peer, engine or export change. `canAcceptInvitation`
and `durableAcceptance` are additive optional config fields. Behavior changes
that consumers must act on:

1. **Legacy acceptance needs a hook.** If you call `acceptInvitation` without
   `durableAcceptance`, add `canAcceptInvitation: async ({ invitation, handle })
   => ...` that resolves the creator's current account and role policy. Without
   it, acceptance returns `{ success: false, error: 'Failed to accept
   invitation' }` and the token stays pending. The hook is not a mutation
   gate. For production, prefer `durableAcceptance`, which serializes every
   auth mutation and recovers after a crash.
2. **The user file must exist.** Seed `admin-users.json` with `[]` (or the
   bootstrap account) before the first acceptance. A missing or corrupt file
   used to be treated as empty and overwritten with only the invitee; it now
   fails the acceptance and is left untouched.
3. **Inactive invitations** (`isActive !== true`) are no longer returned by
   `getInvitation` or `listPendingInvitations`, and cannot be accepted.
4. **Handles must be canonical.** Legacy acceptance used to write any handle
   verbatim. It now refuses empty, padded, uppercase or otherwise
   non-canonical handles with `{ success: false, error: 'Invalid handle' }`
   and leaves the token pending, so lowercase and trim input in your form or
   show that error. Usernames and handles already in the file are now
   reserved case-insensitively.
5. **Repair an existing user file first.** A file written by 0.3.0 can
   already hold an empty handle, two handles that differ only by case or
   spacing, or a duplicate id. 0.4.0 treats it as corrupt and every
   acceptance fails until it is repaired by hand. Check it before upgrading.
6. **Rollback is not state-safe after durable writes.** Before moving back to
   0.3.0, finish recovery and keep the acceptance journal (see the README).

## 0.2.6 — unreleased launch candidate (folded into 0.4.0)

Source/version preparation for TIN-2716, separate from the held invitation 0.3
and auth 0.8 breaking train. See [scope and remaining gates](docs/launch-candidate-0.2.6.md).

- Add optional single-process, file-native invitation acceptance recovery with
  stable receipts, token/handle reservation and replay that never restores old
  user security state. No database or distributed compare-and-set is introduced.
- Fail closed on corrupt/missing established user authority and applied history
  with an empty user projection, without resurrecting accounts or enabling bootstrap.
- Exclude inactive invitations from pending lookup, acceptance and pending lists.
- Scope the translated npm repository as `tummycrypt_tinyland_invitation_npm`
  throughout MODULE/BUILD so the package does not reuse bare `@npm` in a composed
  Bzlmod graph (TIN-1438); dependency versions and runtime API stay unchanged.
- Preserve existing creation options, replaceable policy hook, default role
  hierarchy and initial temporary-TOTP results. Receipt replay omits user and
  temporary-factor material and is not authentication.
- Prepare inert GF v4 action declarations and a source dependency lock; the
  candidate caller remains documentation, not an active workflow or GF proof.
- Refresh the inert caller to immutable ci-templates v5.1.1 and add
  `//:package_artifact_test` to the declared test action. The target checks the
  actual `//:pkg` output with existing locked `publint`, without repacking or
  adding dependencies; warnings remain visible and only errors fail.
- Retire legacy CI/provider-publish workflows and npm publishing configuration
  under corrected TIN-89/TIN-1629 authority. Bzlmod/BCR is the sole first-party
  delivery path; npmjs/GitHub Packages occupancy is not a release gate. Existing
  Bazel runtime/metadata tests remain required, with no replacement publisher or
  active GF caller introduced by this preparation.

## 0.2.5 — released baseline

Canonical tag `v0.2.5` points to `7687bb49b5e3f8719e874946ba1586f4d0d0b83a`.
It carries claim-first token consumption and process-local acceptance locking
(TIN-2781); neither that baseline nor this candidate provides distributed CAS.
