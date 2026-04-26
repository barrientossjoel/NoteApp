/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** PartyKit project host, e.g. "noteapp.<youruser>.partykit.dev" */
    readonly VITE_PARTYKIT_HOST: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
