import { globSync } from 'glob'
import fs from 'fs'
import pathResolver from 'path'
import _ from 'lodash'

const cwd = pathResolver.resolve(`../seed.font.${process.argv[2]}`)

globSync(`${cwd}/font/**/*.{TTF,OTF}`).forEach(path => {
  const newPathDotArray = path.split('.')
  const ext = newPathDotArray.pop()?.toLowerCase()
  const newPath = `${cwd}/font/` + pathResolver.relative(`${cwd}/font`, `${newPathDotArray.join('.').trim()}`.replace(/）/g, ')').replace(/（/g, '(')).split('/')
    .map(part => pascalCase(part))
    .join('/') + `.${ext}`
  const dir = pathResolver.dirname(newPath)
  fs.mkdirSync(dir, { recursive: true })
  fs.renameSync(path, newPath)
})

function pascalCase(str: string) {
  return _.startCase(_.camelCase(str)).replace(/ /g, '')
}
