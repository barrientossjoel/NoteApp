import { onConnect } from 'y-partykit';
import type * as Party from 'partykit/server';

export default class NoteAppServer implements Party.Server {
    constructor(readonly room: Party.Room) { }

    onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
        // Use official y-partykit server to manage YDoc state in memory.
        // We set persist: false to avoid Durable Object corruption, since Turso DB is our canonical storage.
        return onConnect(connection, this.room, {
            persist: false
        });
    }
}
