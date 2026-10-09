// Field kinds shared by the web and mobile text fields: one name per kind of data, mapped to the right
// input type, autofill hint and on-screen keyboard on each platform.

/**
 * Field kinds. Web uses `type`, `autoComplete` and `inputMode`; mobile uses `keyboardType`,
 * `autoComplete` (Android), `textContentType` (iOS) and `autoCapitalize`.
 */
export const FIELD_KINDS = {
  text: {
    type: "text",
    autoComplete: "off",
    inputMode: "text",
    keyboardType: "default",
    nativeAutoComplete: "off",
    textContentType: "none",
    autoCapitalize: "sentences",
  },
  username: {
    type: "text",
    autoComplete: "username",
    inputMode: "text",
    keyboardType: "default",
    nativeAutoComplete: "username",
    textContentType: "username",
    autoCapitalize: "none",
  },
  name: {
    type: "text",
    autoComplete: "name",
    inputMode: "text",
    keyboardType: "default",
    nativeAutoComplete: "name",
    textContentType: "name",
    autoCapitalize: "words",
  },
  // A password chosen now, as on sign-up: the browser and the phone offer to make one up and save it.
  newPassword: {
    type: "password",
    autoComplete: "new-password",
    inputMode: "text",
    keyboardType: "default",
    nativeAutoComplete: "password-new",
    textContentType: "newPassword",
    autoCapitalize: "none",
  },
  password: {
    type: "password",
    autoComplete: "current-password",
    inputMode: "text",
    keyboardType: "default",
    nativeAutoComplete: "password",
    textContentType: "password",
    autoCapitalize: "none",
  },
  email: {
    type: "email",
    autoComplete: "email",
    inputMode: "email",
    keyboardType: "email-address",
    nativeAutoComplete: "email",
    textContentType: "emailAddress",
    autoCapitalize: "none",
  },
  number: {
    type: "text",
    autoComplete: "off",
    inputMode: "numeric",
    keyboardType: "number-pad",
    nativeAutoComplete: "off",
    textContentType: "none",
    autoCapitalize: "none",
  },
  decimal: {
    type: "text",
    autoComplete: "off",
    inputMode: "decimal",
    keyboardType: "decimal-pad",
    nativeAutoComplete: "off",
    textContentType: "none",
    autoCapitalize: "none",
  },
  search: {
    type: "search",
    autoComplete: "off",
    inputMode: "search",
    keyboardType: "default",
    nativeAutoComplete: "off",
    textContentType: "none",
    autoCapitalize: "none",
  },
} as const;

export type FieldKind = keyof typeof FIELD_KINDS;
