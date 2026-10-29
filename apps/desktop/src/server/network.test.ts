import assert from "node:assert/strict";
import { test } from "node:test";
import { networkWarnings, parseNetworkReport, type NetworkReport } from "./network.ts";

/** A home Wi-Fi set to Private, with the rule Windows made from its prompt on private networks only. */
const PRIVATE: NetworkReport = {
  profiles: [{ name: "Oficina", category: "Private" }],
  rules: [{ name: "APC Universal Repair", enabled: "True", direction: "Inbound", action: "Allow", profile: "Private" }],
};
/** An inbound rule that allows the app, on the profiles given. */
const allowedOn = (profile: string) => ({ name: "APC Universal Repair", enabled: "True", direction: "Inbound", action: "Allow", profile });

// Reads the report as the script writes it, and refuses what isn't one.
test("Desktop: the network report is read from PowerShell's JSON", () => {
  const text =
    '{"profiles":[{"category":"Public","name":"Camilo"}],"rules":[{"direction":"Inbound","name":"APC Universal Repair","profile":"Public","action":"Allow","enabled":"True"}]}';
  assert.deepEqual(parseNetworkReport(text), {
    profiles: [{ category: "Public", name: "Camilo" }],
    rules: [{ direction: "Inbound", name: "APC Universal Repair", profile: "Public", action: "Allow", enabled: "True" }],
  });
  assert.equal(parseNetworkReport(""), undefined);
  assert.equal(parseNetworkReport('{"profiles":[]}'), undefined);
  assert.equal(parseNetworkReport("Get-NetConnectionProfile : Acesso negado."), undefined);
});

// Checks a private network with private-only rules warns of nothing, a network set to Public is named, and a rule that
// allows the app on public networks warns once, whether it says Public, Any or both profiles; a blocked, disabled or
// outbound one doesn't.
test("Desktop: a public network or a rule open on public networks is warned about", () => {
  assert.deepEqual(networkWarnings(PRIVATE), []);
  assert.deepEqual(networkWarnings({ ...PRIVATE, profiles: [{ name: "Camilo", category: "Public" }] }), [
    "A rede “Camilo” está como Pública, então quem estiver nela chega ao servidor. Deixe-a como Privada nas configurações de Wi-Fi do Windows (passo 3 do guia do servidor em casa).",
  ]);
  const openRule = "Uma regra do firewall do Windows libera o APC em redes públicas. Deixe-a só para redes privadas (passo 3 do guia do servidor em casa).";
  for (const profile of ["Public", "Any", "Private, Public"]) {
    assert.deepEqual(networkWarnings({ ...PRIVATE, rules: [...PRIVATE.rules, allowedOn(profile), allowedOn(profile)] }), [openRule], profile);
  }
  for (const rule of [
    { ...allowedOn("Public"), action: "Block" },
    { ...allowedOn("Public"), enabled: "False" },
    { ...allowedOn("Public"), direction: "Outbound" },
    allowedOn("Domain"),
  ]) {
    assert.deepEqual(networkWarnings({ ...PRIVATE, rules: [rule] }), [], JSON.stringify(rule));
  }
});
