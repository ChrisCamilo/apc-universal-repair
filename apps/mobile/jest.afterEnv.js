/* eslint-env jest */
// Runs in each test file once Jest's globals are in: each test starts with no copy of the inventory, as after logging
// out, and with no sync of the last test still running.
afterEach(() => require('./src/features/sync/inventoryCopy').clearCopy());
