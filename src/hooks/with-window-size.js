import React, {
  useState,
  useEffect
} from 'react'

import { debounce } from 'src/utils/helpers'



export const withWindowSize = mapSizesToProps => Component => {
  const MyComponent = props => {
    const [dimensions, setDimensions] = useState({ 
      width: undefined,
      height: undefined
    })

    useEffect(() => {
      const handleResize = () => {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight
        })
      }

      // set values on mount (initial values are undefined for cases where ssr is used
      handleResize()

      const debouncedHandleResize = debounce(handleResize, 100)

      window.addEventListener('resize', debouncedHandleResize)

      return _ => {
        window.removeEventListener('resize', debouncedHandleResize)
      }
    }, [])

    const sizeProps = mapSizesToProps({ ww: dimensions.width, wh: dimensions.height })

    return (
      <Component
        {...props}
        {...sizeProps}
      />
    )
  }

  MyComponent.displayName = 'WithWindowSizeComponent'

  return MyComponent
}
