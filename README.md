# Tinyland invitation authority

`@tummycrypt/tinyland-invitation` owns invitation creation and acceptance policy
hooks. The consumer resolves the current creator and supplies its role policy;
an old invitation or a caller-supplied creator role is not current authority.

The unreleased [0.2.6 launch candidate](docs/launch-candidate-0.2.6.md) preserves
the 0.2.5 API for the existing-admin, single-writer mothership. Its source/version
preparation does not release the held invitation 0.3/auth 0.8 breaking train or
authorize publication, workflow activation or deployment.

Under corrected TIN-89/TIN-1629 authority, Bzlmod and the append-only Tinyland BCR
are the sole first-party delivery path. GitHub tags/releases identify source;
npmjs and GitHub Packages are neither delivery lanes nor release blockers. The
legacy CI/publish workflows and package publishing configuration are retired.
The GF action plan and caller candidate remain inert pending the current
released/admitted binding; no active workflow or remote qualification is claimed.

## Durable file-native acceptance

Opt in with `InvitationConfig.durableAcceptance`:

```ts
durableAcceptance: {
  operationsFilePath: join(authDirectory, 'invitation-acceptance-operations.json'),
  withMutationGate: (operation) => enrollment.withReadyAuth(operation),
  canAcceptInvitation: async ({ invitation, handle }) => {
    // Resolve current active, fully onboarded creator and current role policy.
    return authorizeCurrentInvitationCreator(invitation, handle);
  },
  verifyPassword,
}
```

This is a **single-process recovery protocol**, not cross-process locking or a
distributed transaction. Keep one process against the file authority. The
consumer must use the same reentrant mutation gate for all user, session, role,
handle, removal and factor mutations. Before protected auth decisions, invoke:

```ts
enrollment.withReadyAuth(async () => {
  await invitationService.recoverPendingAcceptances();
  return protectedOperation();
});
```

Recovery must finish before returning user/security state. A failed recovery is
a failed auth barrier, never permission to use a partial or cached projection.
Projection callbacks must use raw underlying file operations, not recursively
invoke that protected-operation wrapper.

The existing `readFile` hook must distinguish ENOENT from unreadable/corrupt
state. `writeFile` must atomically replace its target, sync its contents, and sync
the containing directory. Both projections and the private operations file must
live on persistent storage. The user authority must already exist: an invitation
requires an existing creator, and a missing user file is not an empty install.
Already-applied history requires a non-empty user projection before recovery,
including when other committed operations remain pending. Pure committed history
may first finish its initial user projection; any acceptance history then requires
a non-empty result. Retained tombstones satisfy this invariant; applied receipts
never recreate accounts to repair an empty projection or permit fresh bootstrap.

### Commit, recovery and receipts

- A fsynced private journal fixes the token digest, canonical handle, user ID,
  initial password hash and operation receipt before either projection changes.
- Recovery finishes token consumption and creates only a missing attributed user.
  A matching existing user is never overwritten, even after a password, role,
  factor, onboarding or removal change. Conflicting identities fail closed.
- Applied journal entries retain only the receipt and token digest, not the
  original account snapshot. Applied entries never reproject. Retain them with
  auth state: they reserve handles even after an external user-file cleanup.
- `AcceptResult.receipt` contains `operationId`, `invitationId`, `userId`,
  `handle` and `committedAt`. Receipt retries verify the **current** password and
  account state, return the same receipt with `replayed: true`, and omit `user`,
  `needsOnboarding` and `tempTotpSecret`.
- A replay is **not authentication**. The route must branch on `replayed` before
  session creation and send the user through ordinary login/MFA. POST handling
  must reach `acceptInvitation` rather than pre-reject a consumed token if it
  wants lost-response receipt recovery. GET may display a normal-login link.
- Receipt commit is the authority if the optional audit sink fails. Recovery does
  not replay audit events or reissue invitation credentials.

All invitation-service reads and mutations join the supplied gate when this mode
is enabled. Switching back to an older package after accepting new writes is not
a state-safe rollback: preserve journals and finish recovery with a compatible
implementation first.

## Legacy (non-durable) acceptance

The legacy mode remains available for compatibility. It does not offer the
crash recovery contract above, and it has no shared mutation gate. It never
writes the user file without a consumer decision:

```ts
canAcceptInvitation: async ({ invitation, handle }) =>
  authorizeCurrentInvitationCreator(invitation, handle),
```

- Without `canAcceptInvitation`, `acceptInvitation` refuses before reading,
  claiming or writing anything.
- The hook is asked before the token is claimed and again after the password
  is hashed. A denial before the claim leaves the token pending; a later
  denial or failure leaves it consumed and writes no user.
- The user file is read strictly, as in durable mode. A missing, unreadable or
  corrupt file fails the acceptance and is never rewritten. Seed it with `[]`
  or the bootstrap account first. The new user is appended to a fresh,
  successful read taken after hashing.
- Handles follow the durable rule: already trimmed and lowercase and matching
  `^[a-z0-9][a-z0-9_-]*$`. Any other handle (including empty, `ROOT` or
  ` root`) is refused with `Invalid handle` before any read, hook call, claim
  or write. An existing handle or retained username alias is reserved
  case-insensitively, both before the claim and after hashing, and a generated
  user id that already exists is refused. Acceptance therefore never writes a
  user file that its own strict reader would reject.

## Validation

`//:test` includes the recovery tests through the existing Bazel glob. They cover
commit/projection interruptions, lost acknowledgements, stable receipts, concurrent
handle claims, retained tombstones, corrupt/missing authority and creator/expiry
rechecks. Source version/namespace and publication-retirement contracts also stay
inside `//:test`; `//:pkg` depends on the TypeScript compilation target.
`//:package_artifact_test` checks the actual generated package's manifest and
declared files with locked `publint`, without repacking or importing its runtime.
A release is qualified by exact-source `bazel test //...` evidence (both targets)
and an independent review before merge. Pull-request CI also runs, and any
post-merge failure is fixed forward.
