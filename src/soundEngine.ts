import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import type { SoundCategory, SoundErrorConfig } from "./types";
import { Logger } from "./logger";

interface PlaybackCommand {
  command: string;
  args: string[];
}

export class SoundEngine {
  private readonly pathCache = new Map<string, string | undefined>();

  constructor(
    private readonly extensionPath: string,
    private readonly logger: Logger
  ) {}

  clearCache(): void {
    this.pathCache.clear();
  }

  async play(category: SoundCategory, config: SoundErrorConfig): Promise<void> {
    const resolvedPath = this.resolveSoundPath(category, config.customSoundPath);
    if (!resolvedPath) {
      return;
    }

    this.spawnPlayback(resolvedPath, config.volume);
  }

  private resolveSoundPath(category: SoundCategory, customSoundPath: string): string | undefined {
    const cacheKey = `${customSoundPath}|${category}`;
    if (this.pathCache.has(cacheKey)) {
      return this.pathCache.get(cacheKey);
    }

    let resolved: string | undefined;
    if (customSoundPath && isAbsolute(customSoundPath)) {
      const customFile = join(customSoundPath, `${category}.wav`);
      if (existsSync(customFile)) {
        resolved = customFile;
      }
    }

    if (!resolved) {
      const bundled = join(this.extensionPath, "media", "default-pack", `${category}.wav`);
      if (existsSync(bundled)) {
        resolved = bundled;
      }
    }

    this.pathCache.set(cacheKey, resolved);
    return resolved;
  }

  private spawnPlayback(filePath: string, volume: number): void {
    const { command, args } = buildPlaybackCommand(filePath, volume);

    try {
      const child = spawn(command, args, {
        stdio: "ignore",
        windowsHide: true,
        detached: false
      });

      child.once("error", (error) => {
        this.logger.debug(`Playback process error: ${error.message}`);
      });

      child.once("exit", (code, signal) => {
        if (typeof code === "number" && code !== 0) {
          this.logger.debug(`Playback process exited with code ${code}`);
        } else if (signal) {
          this.logger.debug(`Playback process exited due to signal ${signal}`);
        }
      });
    } catch (error) {
      this.logger.debug(`Playback skipped: ${(error as Error).message}`);
    }
  }
}

export function buildPlaybackCommand(
  filePath: string,
  volume: number,
  platform: NodeJS.Platform = process.platform
): PlaybackCommand {
  const clampedVolume = Math.min(1, Math.max(0, volume));

  if (platform === "win32") {
    const escapedPath = filePath.replace(/'/g, "''");
    const script = [
      "Add-Type -AssemblyName PresentationCore",
      "$sync = New-Object System.Threading.AutoResetEvent($false)",
      "$player = New-Object System.Windows.Media.MediaPlayer",
      "$mediaEndedHandler = [System.EventHandler]{ param($sender, $eventArgs) $sync.Set() | Out-Null }",
      "$mediaFailedHandler = [System.Windows.Media.ExceptionEventHandler]{ param($sender, $eventArgs) $sync.Set() | Out-Null }",
      "$player.add_MediaEnded($mediaEndedHandler)",
      "$player.add_MediaFailed($mediaFailedHandler)",
      `$player.Volume = ${clampedVolume.toFixed(3)}`,
      `$player.Open([Uri]'${escapedPath}')`,
      "$player.Play()",
      "$sync.WaitOne() | Out-Null",
      "$player.remove_MediaEnded($mediaEndedHandler)",
      "$player.remove_MediaFailed($mediaFailedHandler)",
      "$player.Close()",
      "$sync.Dispose()"
    ].join(";");

    return {
      command: "powershell",
      args: ["-NoProfile", "-NonInteractive", "-Command", script]
    };
  }

  if (platform === "darwin") {
    return {
      command: "afplay",
      args: ["-v", clampedVolume.toFixed(2), filePath]
    };
  }

  const escapedPath = filePath.replace(/'/g, "'\\''");
  return {
    command: "sh",
    args: ["-c", `paplay '${escapedPath}' >/dev/null 2>&1 || aplay '${escapedPath}' >/dev/null 2>&1`]
  };
}
