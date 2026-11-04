import { encode } from 'uqr'
import { fingerprintGroups, pairingLink, type Pairing } from '@apc/shared/pairing'
import { pairingCode } from './PairingCode.styles.ts'

// What the phone pairs with, in the Servidor dialog while the phone's access is on: a QR code holding the pairing
// link (see @apc/shared/pairing), which the phone's camera reads on its Conectar ao servidor screen, and the same
// address and code to type in, the code in groups of four. The code is the fingerprint of the certificate the server
// answers HTTPS with: the phone trusts that certificate alone.

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
  const qr = encode(pairingLink(pairing), { ecc: 'M', border: QUIET_ZONE })
  return (
    <div className={classes.base()} data-testid={ids.base}>
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
      </dl>
    </div>
  )
}
