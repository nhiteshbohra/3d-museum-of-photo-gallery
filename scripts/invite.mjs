#!/usr/bin/env node
// =========================================================================
// INVITATION MANAGEMENT CLI (scripts/invite.mjs)
// Secure server-side CLI to generate, list, and revoke private invites (Q2).
// Usage:
//   node scripts/invite.mjs list
//   node scripts/invite.mjs create <name> [ttlHours] [customCode]
//   node scripts/invite.mjs revoke <code>
// =========================================================================

import { createInvite, listInvites, revokeInvite, resetSessions, clearAll } from './inviteStore.js'

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

  case 'set': {
    // Quick passcode setter: node scripts/invite.mjs set "29 05 12" [recipient] [ttlHours]
    const customCode = args[1]
    if (!customCode) {
      console.error('Usage: node scripts/invite.mjs set <passcode> [recipient] [ttlHours]')
      process.exit(1)
    }
    const recipient = args[2] || 'Maya & Ethan'
    const ttl = args[3] ? parseFloat(args[3]) : 87600 // 10 years by default for custom couple passcodes
    const record = createInvite({ recipient, ttlHours: ttl, customCode })
    console.log('\n=======================================================')
    console.log('  PERMANENT PASSCODE CONFIGURED')
    console.log('=======================================================')
    console.log(`  Passcode:     ${record.code}`)
    console.log(`  Recipient:    ${record.recipient}`)
    console.log(`  Expires At:   ${new Date(record.expiresAt).toLocaleString()}`)
    console.log('  Accepted as:  "29 05 12", "290512", or "29-05-12"')
    console.log('=======================================================\n')
    break
  }

  case 'reset': {
    // Deletes all active sessions from disk
    const count = resetSessions()
    console.log(`\n✓ Reset complete: ${count} active session(s) removed from invites.json.\n`)
    break
  }

  case 'clear': {
    // Wipes all invitations and sessions
    clearAll()
    console.log('\n✓ Cleared all invitations and sessions from invites.json.\n')
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
    console.log('  node scripts/invite.mjs set <passcode> [recipient]             - Set custom passcode (e.g. 29 05 12)')
    console.log('  node scripts/invite.mjs create <name> [ttlHours] [customCode]  - Issue an invitation')
    console.log('  node scripts/invite.mjs list                                   - List all invitations')
    console.log('  node scripts/invite.mjs reset                                  - Delete all active sessions')
    console.log('  node scripts/invite.mjs clear                                  - Delete all invitations & sessions')
    console.log('  node scripts/invite.mjs revoke <code>                          - Revoke an invitation\n')
    break
}

