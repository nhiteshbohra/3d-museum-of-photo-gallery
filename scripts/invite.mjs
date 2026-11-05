#!/usr/bin/env node
// =========================================================================
// INVITATION MANAGEMENT CLI (scripts/invite.mjs)
// Secure server-side CLI to generate, list, and revoke private invites (Q2).
// Usage:
//   node scripts/invite.mjs list
//   node scripts/invite.mjs create <name> [ttlHours] [customCode]
//   node scripts/invite.mjs revoke <code>
// =========================================================================

import { createInvite, listInvites, revokeInvite } from './inviteStore.js'

const args = process.argv.slice(2)
const command = args[0] ? args[0].toLowerCase() : 'help'

switch (command) {
  case 'create': {
    const recipient = args[1] || 'Guest'
    const ttl = args[2] ? parseFloat(args[2]) : 24
    const customCode = args[3] || null
    const record = createInvite({ recipient, ttlHours: ttl, customCode })
    console.log('\n=======================================================')
    console.log('  PRIVATE INVITATION CREATED SUCCESSFULLY')
    console.log('=======================================================')
    console.log(`  Recipient:    ${record.recipient}`)
    console.log(`  Invite Code:  ${record.code}`)
    console.log(`  Valid For:    ${ttl} hours`)
    console.log(`  Expires At:   ${new Date(record.expiresAt).toLocaleString()}`)
    console.log(`  Invite Link:  ?invite=${record.code}`)
    console.log('=======================================================\n')
    break
  }

  case 'list': {
    const all = listInvites()
    console.log('\n=======================================================')
    console.log(`  ACTIVE & RECORDED INVITATIONS (${all.length})`)
    console.log('=======================================================')
    if (all.length === 0) {
      console.log('  No invitations found.')
    } else {
      console.table(
        all.map((inv) => ({
          Code: inv.code,
          Recipient: inv.recipient,
          Status: inv.status.toUpperCase(),
          Expires: new Date(inv.expiresAt).toLocaleDateString(),
          Redeemed: inv.redeemed ? 'YES' : 'NO',
        }))
      )
    }
    console.log('')
    break
  }

  case 'revoke': {
    const code = args[1]
    if (!code) {
      console.error('Usage: node scripts/invite.mjs revoke <code>')
      process.exit(1)
    }
    const ok = revokeInvite(code)
    if (ok) {
      console.log(`✓ Invitation "${code}" has been revoked. Any active session terminated.`)
    } else {
      console.error(`❌ Invitation "${code}" was not found.`)
      process.exit(1)
    }
    break
  }

  default:
    console.log('\nOur Museum 3D — Invitation CLI')
    console.log('Commands:')
    console.log('  node scripts/invite.mjs create <name> [ttlHours] [customCode]  - Issue an invitation')
    console.log('  node scripts/invite.mjs list                                   - List all invitations')
    console.log('  node scripts/invite.mjs revoke <code>                          - Revoke an invitation\n')
    break
}

