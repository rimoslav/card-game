module.exports = {
  plugins: [
    [
      'babel-plugin-root-import',
      {
        rootPathSuffix: './',
        rootPathPrefix: '~/'
      }
    ],
    [
      'styled-components',
      {
        displayName: true, // see components displayName in React DevTools
        fileName: false, // force components displayName instad of the file name while prefixing selectors
        pure: true // dead code elimination
      }
    ]
  ]
}
