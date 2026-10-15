import { hashToken, type ActiveSession, type SessionLookup } from "./sessions.js";

// A stand-in for the sessions, so route tests run without a database: one live session, whose token the AUTHORIZED
// headers send. Hand TEST_SESSIONS to buildApp.

/** The token of the one session. */
export const TEST_TOKEN = "test-token";
/** The headers of a request from the one session. */
export const AUTHORIZED = { authorization: `Bearer ${TEST_TOKEN}` };
/** The one session. */
export const TEST_SESSION: ActiveSession = { id: "test-session", userId: "test-user", tokenHash: hashToken(TEST_TOKEN) };
/** Finds the one session, by its token or its id. */
export const TEST_SESSIONS: SessionLookup = {
  byId: async (id) => (id === TEST_SESSION.id ? TEST_SESSION : null),
  byToken: async (token) => (token === TEST_TOKEN ? TEST_SESSION : null),
};
