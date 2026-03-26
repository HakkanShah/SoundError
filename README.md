# Sound Error

Sound Error is a VS Code extension that plays configurable sound effects for coding and terminal failures.

## Features 

- Diagnostic monitoring for syntax/type/multi-error events.
- Terminal monitoring for build, runtime, and test failures.
- Optional success sounds for successful terminal commands.
- Custom sound pack support with fallback to bundled defaults.
- Global and per-category cooldown control.
- Modes: `meme`, `chaos`, `silent-success`, `off`.
- Commands to test sounds, reload pack, and cycle mode.

## Settings

```json
{
  "soundError.enabled": true,
  "soundError.volume": 0.8,
  "soundError.cooldown": 3000,
  "soundError.enableWarnings": false,
  "soundError.customSoundPath": "",
  "soundError.mode": "meme",
  "soundError.enableSuccessSound": true
}
```

## Modes

- `meme`: standard cooldown behavior.
- `chaos`: cooldown bypassed.
- `silent-success`: only success sounds are allowed.
- `off`: all playback disabled.

## Custom Sound Pack

Set `soundError.customSoundPath` to an absolute directory path with WAV files:

```text
custom-sound-pack/
  syntax.wav
  type.wav
  build-fail.wav
  runtime.wav
  test-fail.wav
  success.wav
  warning.wav
  multi-error.wav
```

If a file is missing in the custom pack, Sound Error falls back to bundled defaults.

## Commands

- `Sound Error: Test Sound`
- `Sound Error: Reload Sound Pack`
- `Sound Error: Toggle Mode`

## Terminal Detection Notes

This version uses stable VS Code APIs and classifies terminal outcomes using command text plus exit code. It does not parse raw terminal stream output.

## Development

```bash
npm install
npm run build
npm run test:unit
```

Integration smoke tests:

```bash
npm run test:integration
```
