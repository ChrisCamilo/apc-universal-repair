// Whether the phone logs in with a username and password, on the login and sign-up screens (LoginScreen.tsx and
// RegisterScreen.tsx). Off: the phone's data lives on the computer's server, so reading the computer's QR code on
// Conectar ao servidor is the login, into the account open there (see ConnectScreen.tsx and POST /sessions/pairing),
// and the login, the sign-up and their way to each other are set aside, kept as they were, with their tests. They
// come back with the offline mode (EP-17), to open the phone's copy of the data away from the server: turning this on
// brings back the flow as it was, the login first and Conectar ao servidor from it.

/** Whether the phone logs in with a password; off while pairing is the login. */
export const PASSWORD_LOGIN = false;
