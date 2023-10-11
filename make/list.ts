import fontkit from 'fontkit'
import { globSync } from 'glob'
import fs from 'fs'
import pathResolver from 'path'
import _ from 'lodash'
import * as detector from '@nerdbond/talk/host/code/script/detect'
import type { Block } from '@nerdbond/talk/host/code/script/detect'

const script = process.argv[2]
const cwd = pathResolver.resolve(`../seed.font.${script}`)

const index: Record<string, any> = loadIndex()
const TYPE: Record<string, string> = {
  ttf: 'truetype',
  otf: 'opentype',
}
const BLOCKS_MAP: Record<string, Array<Block>> = {
  tibetan: detector.TIBETAN_UNICODE_BLOCKS
}
const BLOCKS_MISSING_MAP: Record<string, Array<Block>> = {
  tibetan: detector.TIBETAN_UNICODE_BLOCKS_MISSING
}
const blocks = BLOCKS_MAP[script] ?? []
const blocksMissing = BLOCKS_MISSING_MAP[script] ?? []
const list: Array<any> = []

globSync(`${cwd}/font/**/*.{ttf,otf}`).forEach(path => {
  const pathDotArray = path.split('.')
  const ext = pathDotArray.pop() ?? 'ttf'
  const name = pathResolver.basename(pathDotArray.join('.'))
  const type = TYPE[ext]
  const relativePath = pathResolver.relative(cwd, path)
  const font = fontkit.openSync(path)
  const glyph: Array<number> = []
  const missing: Array<number> = []
  blocks.forEach(([start, end]) => {
    let i = start
    while (i <= end) {
      if (!isMissing(i)) {
        if (font.hasGlyphForCodePoint(i)) {
          glyph.push(i)
        } else {
          missing.push(i)
        }
      }
      i++
    }
  })
  // so we can add other metadata to the index
  // MANUALLY and not have it be overridden.
  index[name] ??= {}
  index[name].name = name
  index[name].path = relativePath
  index[name].glyph = {
    length: glyph.length,
    has: glyph.map(x => x.toString(16).padStart(4, '0')).join(':'),
    missing: missing.length ? missing.map(x => x.toString(16).padStart(4, '0')).join(':') : undefined,
  }

  if (!glyph.length) {
    delete index[name]
  } else {
    list.push(index[name])
  }
})

const finalIndex: Record<string, any> = {}

list.sort((a, b) => b.glyph.length - a.glyph.length)

list.forEach(item => {
  finalIndex[item.name] = item
})

fs.writeFileSync(`${cwd}/index.json`, JSON.stringify(finalIndex, null, 2))

function loadIndex() {
  try {
    return JSON.parse(fs.readFileSync(`${cwd}/index.json`, 'utf-8'))
  } catch (e) {
    return {}
  }
}

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
