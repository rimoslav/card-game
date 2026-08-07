import { Blank } from '@cg/components/common/blank'
import { Button } from '@cg/components/common/button'
import { Text } from '@cg/components/common/text'
import { Wrap } from '@cg/components/common/wrap'
import { PlayingTable } from '@cg/components/playing-table'
import { MAX_PLAYERS, MIN_PLAYERS } from '@cg/constants'
import { useCreateNewGame } from '@cg/hooks/use-create-game'
import { range } from '@cg/lib/utils'

export const Home = () => {
  const { isLoading, error, startNewGame } = useCreateNewGame()

  return (
    <PlayingTable>
      <Wrap direction="col" align="center">
        <Text size={30} align="center">Select Number Of Players</Text>
        <Blank height={50} />
        <Wrap align="center" justify="center" wrap>
          {range(MIN_PLAYERS, MAX_PLAYERS + 1).map(count => (
            <Wrap key={count}>
              <Blank width={20} />
              <Button
                onClick={() => void startNewGame(count)}
                textColor="darkSlateGray"
                isDisabled={isLoading}>
                {`${count} Players`}
              </Button>
              <Blank width={20} />
            </Wrap>
          ))}
        </Wrap>
        {isLoading
          ? <Text size={18} color="white">Dealing…</Text>
          : null
        }
        {error
          ? <Text size={18} color="white">{error}</Text>
          : null
        }
      </Wrap>
    </PlayingTable>
  )
}
