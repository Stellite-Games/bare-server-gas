interface ImportMetaEnv {
  readonly VITE_EXTERNAL_BARE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __FIELD_MAP__: {
  url: string;
  method: string;
  headers: string;
  body: string;
  status: string;
  statusText: string;
  encoding: string;
};

declare const __EXTERNAL_BARE_URL__: string;
