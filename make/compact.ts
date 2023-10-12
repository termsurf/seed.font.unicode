import fontkit from 'fontkit'
import { globSync } from 'glob'
import fs from 'fs'
import pathResolver from 'path'
import _ from 'lodash'
import * as detector from '@nerdbond/talk/host/code/script/detect'
import type { Block } from '@nerdbond/talk/host/code/script/detect'
import Fontmin from 'fontmin'

const script = process.argv[2]
const cwd = pathResolver.resolve(`../seed.font.${script}`)

const BLOCKS_MAP: Record<string, Array<Block>> = {
  tibetan: detector.TIBETAN_UNICODE_BLOCKS,
}
const BLOCKS_MISSING_MAP: Record<string, Array<Block>> = {
  tibetan: detector.TIBETAN_UNICODE_BLOCKS_MISSING,
}
const blocks = BLOCKS_MAP[script] ?? []
const blocksMissing = BLOCKS_MISSING_MAP[script] ?? []

fs.mkdirSync(`${cwd}/optimized/font`, { recursive: true })

globSync(`${cwd}/font/**/*.{ttf,otf}`).forEach(path => {
  const relativePath = pathResolver.relative(`${cwd}/font`, path)
  console.log(relativePath)
  const font = fontkit.openSync(path)
  const glyph: Array<any> = []
  blocks.forEach(([start, end]) => {
    let i = start
    while (i <= end) {
      if (!isMissing(i)) {
        if (hasGlyph(font, i)) {
          glyph.push(String.fromCodePoint(i))
        }
      }
      i++
    }
  })

  // const subset = font.createSubset()
  // glyph.forEach(glyph => {
  //   subset.includeGlyph(glyph)
  // })

  // const buffer = subset.encode()

  new Fontmin()
    .src(path)
    // .dest(`${cwd}/optimized/font/${relativePath}`)
    .use(
      Fontmin.glyph({
        text: glyph.join(''),
        hinting: false, // keep ttf hint info (fpgm, prep, cvt). default = true
      }),
    )
    .run(function (err, files) {
      if (err) {
        throw err
      }

      const dir = pathResolver.dirname(
        `${cwd}/optimized/font/${relativePath}`,
      )
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(
        `${cwd}/optimized/font/${relativePath}`,
        files[0].contents,
      )
      // => { contents: <Buffer 00 01 00 ...> }
    })
})

function isMissing(point: number) {
  if (!blocksMissing) {
    return false
  }

  for (const [start, end] of blocksMissing) {
    let i = start
    while (i <= end) {
      if (i === point) {
        return true
      }
      i++
    }
  }

  return false
}

function hasGlyph(font: any, point: number) {
  if (!font.hasGlyphForCodePoint(point)) {
    return false
  }

  try {
    const glyph = font.glyphForCodePoint(point)
    const svg = glyph.path.toSVG().trim()
    return Boolean(svg)
  } catch (e) {
    return false
  }

  // ctx.clearRect(0, 0, canvas.width, canvas.height)

  // try {
  //   const glyph = font.glyphForCodePoint(point)
  //   glyph.render(ctx, 32)
  //   return isCanvasBlank(canvas)
  // } catch (e) {
  //   return false
  // }
}
