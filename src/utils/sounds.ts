import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";

type SoundName = "pop" | "tick" | "glass";

/**
 * Loads sounds via require() so Metro bundles them as real assets.
 * This avoids the runtime WAV-generation + File.write path, which was
 * unreliable and hit the Android "under 1 second" bug.
 *
 * Adjust the relative path if your sounds.ts lives elsewhere.
 */
const SOUND_SOURCES: Record<SoundName, number> = {
  pop: require("../../assets/sounds/pop.wav"),
  tick: require("../../assets/sounds/tick.wav"),
  glass: require("../../assets/sounds/glass.wav"),
};

let ready = false;
const players: Partial<Record<SoundName, AudioPlayer>> = {};

/** Called once on app start. Idempotent. */
export async function initSounds(): Promise<void> {
  if (ready) return;

  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });

    // Create players
    for (const name of Object.keys(SOUND_SOURCES) as SoundName[]) {
      players[name] = createAudioPlayer(SOUND_SOURCES[name]);
    }

    // Prime the audio pipeline. On Android the very first play() of a
    // freshly-created player can be silent. This "warmup" fixes it.
    for (const player of Object.values(players)) {
      if (!player) continue;
      try {
        player.volume = 0;
        player.play();
        player.pause();
        await player.seekTo(0);
        player.volume = 1;
      } catch {
        // Non-fatal
      }
    }

    ready = true;
    console.log("[sounds] initialized");
  } catch (err) {
    console.warn("[sounds] init failed:", err);
  }
}

/**
 * Plays a sound. Rewinds first so repeated playback works.
 */
export async function playSound(name: SoundName): Promise<void> {
  if (!ready) {
    console.log(`[sounds] playSound("${name}") — not ready, skipping`);
    return;
  }
  const player = players[name];
  if (!player) {
    console.warn(`[sounds] no player for "${name}"`);
    return;
  }
  try {
    await player.seekTo(0);
    player.play();
  } catch (err) {
    console.warn(`[sounds] play "${name}" failed:`, err);
  }
}

/** Optional cleanup. */
export async function unloadSounds(): Promise<void> {
  for (const player of Object.values(players)) {
    try {
      player?.release();
    } catch {}
  }
  ready = false;
}
