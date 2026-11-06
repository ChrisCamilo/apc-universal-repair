import { useEffect, useState } from 'react'
import { encode } from 'uqr'
import type { EntryCode } from '@apc/shared/auth'
import { entryCodeGroups, fingerprintGroups, pairingLink, type Pairing } from '@apc/shared/pairing'
import { Button } from '../../ui/Button'
import { issueEntryCode, type DevicesOutcome } from './devices.ts'
import { pairingCode } from './PairingCode.styles.ts'

// What the phone pairs with, in the Servidor dialog while the phone's access is on: a QR code holding the pairing
// link (see @apc/shared/pairing), which the phone's camera reads on its Conectar ao servidor screen, and the same
// address and codes to type in, in groups of four. The code is the fingerprint of the certificate the server answers
// HTTPS with: the phone trusts that certificate alone. The entry code logs the phone into the account open on this
// computer once this computer authorizes the phone, which it asks about as for any device (see DeviceApprovals.tsx):
// the dialog asks the API for one when it opens and again as each one ends, and "Gerar outro" asks for a new one at
// once, as after a phone used it. Until there is one, the QR code doesn't show, and
// when it can't be had, as when nobody is logged in here, the dialog says why.

/** The modules of quiet zone around the QR code, as the standard asks. */
const QUIET_ZONE = 4

/**
 * Draws a QR code's dark modules as one SVG path, a unit square each.
 * @param modules The code's rows, true for a dark module.
 * @returns The path's d.
 */
function modulesPath(modules: boolean[][]): string {
  return modules.flatMap((row, y) => row.flatMap((dark, x) => (dark ? [`M${x} ${y}h1v1h-1z`] : []))).join('')
}

export function PairingCode({ pairing }: { pairing: Pairing }) {
  const { classes, ids } = pairingCode()
  // The entry code, or why there is none; undefined while it is asked for.
  const [entry, setEntry] = useState<DevicesOutcome<EntryCode>>()
  // Counts the asks for a code, so a new one is asked for as the last one ends or at "Gerar outro".
  const [ask, setAsk] = useState(0)

  // Ask for a code, and for another once it ends.
  useEffect(() => {
    let live = true
    let ending: ReturnType<typeof setTimeout> | undefined
    void issueEntryCode().then((outcome) => {
      if (!live) {
        return
      }
      setEntry(outcome)
      if (outcome.ok) {
        ending = setTimeout(() => setAsk((asked) => asked + 1), Date.parse(outcome.value.expiresAt) - Date.now())
      }
    })
    return () => {
      live = false
      clearTimeout(ending)
    }
  }, [ask])

  const code = entry?.ok ? entry.value.code : undefined
  const qr = code && encode(pairingLink({ ...pairing, entry: code }), { ecc: 'M', border: QUIET_ZONE })
  return (
    <div className={classes.base()} data-testid={ids.base}>
      {qr && (
        <svg
          role="img"
          aria-label="QR code para conectar o celular"
          viewBox={`0 0 ${qr.size} ${qr.size}`}
          shapeRendering="crispEdges"
          className={classes.code()}
          data-testid={ids.code}
        >
          <path d={modulesPath(qr.data)} className={classes.modules()} data-testid={ids.modules} />
        </svg>
      )}
      <dl className={classes.facts()} data-testid={ids.facts}>
        <dt className={classes.term()} data-testid={ids.term}>
          Endereço
        </dt>
        <dd className={classes.value()} data-testid={ids.value}>
          {pairing.url}
        </dd>
        <dt className={classes.term()} data-testid={ids.term}>
          Código
        </dt>
        <dd className={classes.value()} data-testid={ids.value}>
          {fingerprintGroups(pairing.fingerprint)}
        </dd>
        {entry && (
          <>
            <dt className={classes.term()} data-testid={ids.term}>
              Código de entrada
            </dt>
            {code && (
              <dd className={classes.value()} data-testid={ids.value}>
                {entryCodeGroups(code)}
              </dd>
            )}
            <dd className={classes.note()} data-testid={ids.note}>
              <span>{entry.ok ? 'Vale por 5 minutos, para a conta aberta neste computador. Depois, autorize o celular aqui.' : entry.message}</span>{' '}
              <Button variant="link" onClick={() => setAsk((asked) => asked + 1)}>
                {entry.ok ? 'Gerar outro' : 'Tentar de novo'}
              </Button>
            </dd>
          </>
        )}
      </dl>
    </div>
  )
}
