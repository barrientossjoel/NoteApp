import type * as Party from 'partykit/server';

export default class NoteAppServer implements Party.Server {
    constructor(readonly room: Party.Room) { }

    onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
        // Send a manual Yjs Sync Step 1 message so the client finishes "connecting"
        // Protocol: [messageType(0=Sync), messageSyncType(0=Step1), stateVectorLength(1), stateVector(0)]
        connection.send(new Uint8Array([0, 0, 1, 0]));
    }

    onMessage(message: string | ArrayBuffer, sender: Party.Connection) {
        // Echo all Yjs binary updates and awareness messages to other connected clients
        this.room.broadcast(message, [sender.id]);
    }
}
