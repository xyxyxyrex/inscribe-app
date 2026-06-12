export const GAME = {
  MATCH_DURATION_MS: 90_000,
  HP_MAX: 150,
  MANA_MAX: 100,
  MANA_REGEN_PER_SECOND: 5,
  SPEED_BONUS_MULTIPLIER: 1.08,       // +8% effect for cast race winner
  EARLY_LOCK_THRESHOLD: 0.70,          // recognizer confidence for speed bonus
  INTERRUPT_WINDOW_THRESHOLD: 0.40,    // opponent confidence that opens interrupt
  INTERRUPT_WINDOW_DURATION_MS: 1200,
  SILENCE_DURATION_MS: 1500,           // Vael effect
  SHIELD_DECAY_PER_SECOND: 2,
  GRAVEBIND_WINDOW_MS: 3000,
  TIDECURSE_DURATION_MS: 4000,
  MIRRORWIND_WINDOW_MS: 1200,
  REFLECT_DAMAGE_MULTIPLIER: 0.80,
} as const;
