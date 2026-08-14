import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'

import { NUMBER_OF_CARDS_PER_PLAYER } from '@cg/constants'
import { usePlayGameContext } from '@cg/hooks/use-play-game'
import { cx } from '@cg/lib/utils'

import styles from '@cg/components/modal.module.css'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export const Modal = () => {
  const navigate = useNavigate()
  const game = usePlayGameContext()
  const [isDismissed, setIsDismissed] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const restoreToRef = useRef<HTMLElement | null>(null)

  const isOpen = game.roundNumber > NUMBER_OF_CARDS_PER_PLAYER && !isDismissed
  const winners = game.gameLeads.map(lead => lead.name).join(' & ')

  /*
   * Gated on isOpen, not on a mount flag: when the modal is closed this effect does
   * nothing and registers no cleanup, so StrictMode's double invoke on mount is a no-op.
   * The capture and the restore are a matched pair on the same state transition.
   */
  useEffect(() => {
    if (!isOpen) {
      return
    }

    restoreToRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null

    panelRef.current?.focus()

    return () => {
      restoreToRef.current?.focus()
    }
  }, [isOpen])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      setIsDismissed(true)

      return
    }

    if (event.key !== 'Tab') {
      return
    }

    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)

    if (!focusable || focusable.length === 0) {
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    // Wrap at both ends. Without this, Tab walks straight out of the dialog and onto the
    // table behind it, which is exactly what aria-modal promises it will not do.
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className={styles.overlay} data-open={isOpen}>
      <div
        ref={panelRef}
        className={styles.content}
        data-open={isOpen}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-heading"
        tabIndex={-1}
        onKeyDown={handleKeyDown}>
        <h2 id="modal-heading" className={styles.heading}>
          {game.gameLeads.length > 1
            ? `It's a tie — ${winners} win!`
            : `${winners} wins!`
          }
        </h2>
        <p className={styles.subheading}>Final scores</p>
        <table className={styles.scores}>
          <tbody>
            {game.playersSortedByPoints.map(player => (
              <tr
                key={player.id}
                className={cx(game.getIsPlayerLeading(player) && styles.winnerRow)}>
                <td className={styles.scoreName}>{player.name}</td>
                <td className={styles.scoreValue}>{player.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          className={styles.newGame}
          onClick={() => void navigate('/')}>
          New game
        </button>
      </div>
    </div>
  )
}
