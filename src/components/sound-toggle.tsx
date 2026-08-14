import { useSound } from '@cg/hooks/use-sound'

import styles from '@cg/components/sound-toggle.module.css'

export const SoundToggle = () => {
  const { isSoundOn, toggleSound } = useSound()

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-pressed={isSoundOn}
      aria-label="Sound"
      onClick={toggleSound}>
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
        focusable="false">
        <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
        {isSoundOn
          ? <path
            d="M16 8.5a4.5 4.5 0 0 1 0 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          : <path
            d="M16.5 9.5l5 5m0-5l-5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        }
      </svg>
    </button>
  )
}
