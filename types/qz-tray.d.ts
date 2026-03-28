declare module "qz-tray" {
  const qz: {
    websocket: {
      connect: (options?: Record<string, unknown>) => Promise<void>;
      isActive: () => boolean;
    };
    security: {
      setCertificatePromise: (
        handler:
          | ((
              resolve: (v: string) => void,
              reject: (e?: unknown) => void,
            ) => void)
          | Promise<string>,
        options?: { rejectOnFailure?: boolean },
      ) => void;
      setSignaturePromise: (
        factory: (toSign: string) => (resolve: (s: string) => void, reject: (e?: unknown) => void) => void,
      ) => void;
      setSignatureAlgorithm: (alg: "SHA1" | "SHA256" | "SHA512") => void;
    };
    configs: {
      create: (
        printer: string | { name: string },
        options?: Record<string, unknown>,
      ) => {
        print: (data: unknown[]) => Promise<void>;
      };
    };
    printers: {
      find: (query?: string | null) => Promise<string | string[]>;
      getDefault: () => Promise<string>;
    };
  };
  export default qz;
}
