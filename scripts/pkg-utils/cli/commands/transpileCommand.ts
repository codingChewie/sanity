import path from 'path'
import {transpile} from '../../transpile'

/**
 * Transpile a Sanity package
 *
 * - Output files to `lib/` in each package
 * - Transpile each file
 * - Compile TS definitions to `lib/dts/`
 */
export async function transpileCommand(opts: {
  cwd: string
  target: 'node' | 'web'
  // tsconfig?: string
  watch: boolean
  verbose?: boolean
}): Promise<void> {
  const {
    target,
    // tsconfig = 'tsconfig.json',
    watch,
    verbose,
  } = opts

  const cwd = path.resolve(process.cwd(), opts.cwd || '.')

  if (watch) {
    await transpile.watch({
      cwd,
      target,
      verbose,
      // tsconfig
    })
  } else {
    await transpile.build({
      cwd,
      target,
      // tsconfig
    })
  }
}