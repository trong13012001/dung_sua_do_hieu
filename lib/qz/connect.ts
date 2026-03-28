import { configureQzSecurity } from "@/lib/qz/security";

let connectPromise: Promise<void> | null = null;

export async function getQzConnected(): Promise<typeof import("qz-tray").default> {
  const qz = (await import("qz-tray")).default;
  if (qz.websocket.isActive()) return qz;

  if (!connectPromise) {
    configureQzSecurity(qz);
    connectPromise = qz.websocket.connect().catch((err: unknown) => {
      connectPromise = null;
      throw err;
    });
  }

  await connectPromise;
  return qz;
}
