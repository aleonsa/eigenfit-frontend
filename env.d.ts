interface ImportMetaEnv {
  readonly VITE_AUTH0_DOMAIN: string;
  readonly VITE_AUTH0_CLIENT_ID: string;
  readonly VITE_AUTH0_AUDIENCE?: string;
  // more env vars...
  readonly [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
