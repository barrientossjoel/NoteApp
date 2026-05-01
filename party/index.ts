import type * as Party from 'partykit/server';

export default class NoteAppServer implements Party.Server {
    constructor(readonly room: Party.Room) { }

    onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
        // Send a manual Yjs Sync Step 1 message so the client finishes "connecting"
        connection.send(new Uint8Array([0, 0, 1, 0]));

        // Send a manual Yjs Sync Step 2 message (empty update) to complete the handshake
        connection.send(new Uint8Array([0, 1, 2, 0, 0]));
    }

    onMessage(message: string | ArrayBuffer, sender: Party.Connection) {
        // Echo all Yjs binary updates and awareness messages to other connected clients
        console.log(`[PartyKit] Relaying message from ${sender.id} (size: ${message instanceof ArrayBuffer ? message.byteLength : message.length})`);
        this.room.broadcast(message, [sender.id]);
    }
}
