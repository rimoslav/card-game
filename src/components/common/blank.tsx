export const Blank = ({
  width = 0,
  height = 0
}: {
  width?: number
  height?: number
}) => (
  <div
    style={width
      ? { paddingRight: width }
      : { paddingTop: height }
    }
  />
)
