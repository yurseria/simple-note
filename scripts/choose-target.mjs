import { execSync } from 'node:child_process'

const task = process.argv[2]

const commands = {
  dev: { electron: 'npm run dev:electron', tauri: 'npm run dev:tauri' },
  build: { electron: 'npm run build:electron', tauri: 'npm run build:tauri' },
  package: { electron: 'npm run package:electron', tauri: 'npm run package:tauri' },
}

if (!commands[task]) {
  console.error(`Unknown task: ${task}`)
  process.exit(1)
}

const choices = [
  { name: 'Electron', value: 'electron' },
  { name: 'Tauri', value: 'tauri' },
]

function render(selected) {
  // Move cursor up to overwrite previous render (except first render)
  if (render._drawn) {
    process.stdout.write(`\x1b[${choices.length}A`)
  }
  for (let i = 0; i < choices.length; i++) {
    const label = `  ${choices[i].name}  `
    if (i === selected) {
      // White text on blue background
      process.stdout.write(`\x1b[97;44m${label}\x1b[0m`)
    } else {
      process.stdout.write(`\x1b[90m${label}\x1b[0m`)
    }
    process.stdout.write('\n')
  }
  render._drawn = true
}

function prompt() {
  return new Promise((resolve) => {
    let selected = 0

    process.stdout.write(`\n Select target for \x1b[1m${task}\x1b[0m:\n\n`)
    render(selected)

    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')

    process.stdin.on('data', (key) => {
      if (key === '\x1b[A' || key === 'k') {
        selected = (selected - 1 + choices.length) % choices.length
        render(selected)
      } else if (key === '\x1b[B' || key === 'j') {
        selected = (selected + 1) % choices.length
        render(selected)
      } else if (key === '\r' || key === '\n') {
        process.stdin.setRawMode(false)
        process.stdin.pause()
        resolve(choices[selected].value)
      } else if (key === '\x03' || key === '\x1b') {
        process.stdout.write('\x1b[0m\n')
        process.exit(0)
      }
    })
  })
}

const target = await prompt()
const cmd = commands[task][target]
console.log(`\n> ${cmd}\n`)
execSync(cmd, { stdio: 'inherit' })
