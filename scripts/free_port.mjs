import { execSync } from 'child_process'

const port = process.argv[2] || 8080

try {
  if (process.platform === 'win32') {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })
    const lines = out.trim().split('\n')
    const pids = new Set()
    for (const line of lines) {
      if (line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/)
        const pid = parts[parts.length - 1]
        if (pid && pid !== '0' && pid !== String(process.pid)) {
          pids.add(pid)
        }
      }
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
        console.log(`[Port Manager] Freed port ${port} by stopping old process ${pid}`)
      } catch {}
    }
  } else {
    try {
      execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' })
    } catch {}
  }
} catch {}
