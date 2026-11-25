/**
 * @format
 */

import { Linking, PermissionsAndroid, Platform } from 'react-native';
import { askLocalNetwork, hasLocalNetwork, openAppSettings } from './localNetwork';

// The phone's access to the local network, which Android 17 (API 37) asks the user for before the app reaches the
// home server on the Wi-Fi: checked and asked for there, answered as given, refused or refused for good; and never
// asked for on earlier versions.

/**
 * Makes the phone an Android of an API, whose local network access the app holds or not, and whose answer to the ask
 * is given.
 * @param api The Android API, e.g. 37 for Android 17.
 * @param held Whether the app holds the access already.
 * @param answer What the user answers when asked.
 * @returns The stand-in of the ask.
 */
function android(api: number, held: boolean, answer: 'granted' | 'denied' | 'never_ask_again' = 'granted') {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(Platform, 'Version', 'get').mockReturnValue(api);
  jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(held);
  return jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(answer);
}

afterEach(() => jest.restoreAllMocks());

// On Android 16, which has no such access, checks the app may reach the network and nothing is asked.
test('Mobile: an Android before 17 never asks for the local network', async () => {
  const ask = android(36, false);
  expect(await hasLocalNetwork()).toBe(true);
  expect(await askLocalNetwork()).toBe('granted');
  expect(ask).not.toHaveBeenCalled();
});

// On Android 17, checks an access held is used as it is, and one not held is asked for, answered as given, refused,
// or refused for good.
test('Mobile: Android 17 asks for the local network, given, refused or refused for good', async () => {
  const held = android(37, true);
  expect(await askLocalNetwork()).toBe('granted');
  expect(held).not.toHaveBeenCalled();

  for (const [answer, access] of [
    ['granted', 'granted'],
    ['denied', 'denied'],
    ['never_ask_again', 'blocked'],
  ] as const) {
    jest.restoreAllMocks();
    const ask = android(37, false, answer);
    expect(await hasLocalNetwork()).toBe(false);
    expect(await askLocalNetwork()).toBe(access);
    expect(ask).toHaveBeenCalledWith(PermissionsAndroid.PERMISSIONS.ACCESS_LOCAL_NETWORK);
  }
});

// Opens Android's settings, where an access refused for good is given back.
test('Mobile: the app settings open to give the access back', async () => {
  const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
  openAppSettings();
  expect(open).toHaveBeenCalled();
});
