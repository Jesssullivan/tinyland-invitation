import type { InvitationConfig } from './config.js';
import type { AcceptResult, AdminInvite, AdminUser, InvitationAcceptData } from './types.js';
/**
 * Strictly parse the user authority. A read or parse failure is never mapped to
 * an empty list: writing from that list would erase every existing account.
 * Shared by the durable and legacy acceptance paths (internal, not exported
 * from the package entry).
 */
export declare function parseUserProjection(raw: string): AdminUser[];
/**
 * A narrow file-backed commit/replay coordinator, not a distributed transaction.
 * The consumer must serialize all auth mutations and run recovery before auth
 * decisions. Once committed, an operation is authoritative even if the invite
 * expires before restart. Applied receipts are immutable and never reproject.
 */
export declare class DurableInvitationAcceptance {
    private readonly config;
    private readonly durable;
    constructor(config: InvitationConfig);
    withReadyState<T>(operation: () => Promise<T>): Promise<T>;
    recover(): Promise<void>;
    accept(data: InvitationAcceptData): Promise<AcceptResult>;
    private pending;
    private handleReserved;
    private recoverUnlocked;
    private apply;
    readInvitations(): Promise<AdminInvite[]>;
    private readUsers;
    private readProjection;
    private readJournal;
    private writeJournal;
}
//# sourceMappingURL=durable-acceptance.d.ts.map