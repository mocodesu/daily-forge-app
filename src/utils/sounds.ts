import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";

type SoundName = "pop" | "tick" | "glass" | "dayComplete" | "targetReached";

/**
 * Sounds are bundled via require() so Metro ships them with the app.
 * Every file is at least 1000ms long — expo-audio has a known Android
 * issue where sub-1s sounds silently fail on cold start. The generator
 * script pads short tones to exactly 1000ms to dodge it.
 */
const SOUND_SOURCES: Record<SoundName, number> = {
  pop: require("../../assets/sounds/pop.wav"),
  tick: require("../../assets/sounds/tick.wav"),
  glass: require("../../assets/sounds/glass.wav"),
  dayComplete: require("../../assets/sounds/day-complete.wav"),
  targetReached: require("../../assets/sounds/target-reached.wav"),
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

    for (const name of Object.keys(SOUND_SOURCES) as SoundName[]) {
      players[name] = createAudioPlayer(SOUND_SOURCES[name]);
    }

    // Warm the audio pipeline. On Android the first play() of a
    // freshly-created player can be silent without this.
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
 * Plays a sound. expo-audio doesn't auto-rewind on completion, so we
 * seek to 0 first. The seek call is safe even when the player is at
 * position 0 already.
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
