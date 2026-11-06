import type { TestUser } from "./auth.ts";

// The test users of the mocked login (see createMockAuth in @apc/shared/auth), kept in the repo so the web, the app and the tests log
// in the same way. Test values only: never put a real password here. The real backend (EP-10) replaces them.

export const TEST_USERS: readonly TestUser[] = [
  { id: "user-christian", username: "christian.camilo", displayName: "Christian Camilo", password: "opala4100" },
  { id: "user-oficina", username: "oficina", displayName: "Oficina APC", password: "chevette1600" },
];
