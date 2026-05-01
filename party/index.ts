import type * as Party from 'partykit/server';
import { onConnect } from 'y-partykit';

/**
 * NoteApp PartyKit Server
 *
 * Handles real-time Yjs CRDT synchronization for all document and canvas rooms.
 * Each room ID maps to one collaborative session:
 *  - "doc-{id}"    → Text document collaboration
 *  - "canvas-{id}" → Canvas collaboration
 */
export default class NoteAppServer implements Party.Server {
    constructor(readonly room: Party.Room) { }

    async onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
        console.log(`[PartyKit] Client connected to room: ${this.room.id}`);
        try {
            // WIPE the corrupted storage to fix 'Unexpected end of array' crash
            await this.room.storage.deleteAll();
            return onConnect(connection, this.room, { persist: false });
        } catch (err) {
            console.error(`[PartyKit] y-partykit onConnect error:`, err);
        }
    }
}
