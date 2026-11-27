import { MarkdownManager } from '@tiptap/markdown'
import { ELEMENT_NODE, TEXT_NODE, parse, type DocumentNode, type ElementNode, type Node } from 'ultrahtml'

export type RichInlineNode =
  | { type: 'text' | 'code', text: string }
  | { type: 'strong' | 'em' | 'strike', children: RichInlineNode[] }
  | { type: 'break' }
  | { type: 'link', children: RichInlineNode[], href: string }

export interface RichListBlock {
  type: 'list'
  ordered: boolean
  start?: number
  items: RichBlockNode[][]
}

export type RichBlockNode =
  | { type: 'heading', level: 3 | 4, inlines: RichInlineNode[] }
  | { type: 'paragraph', inlines: RichInlineNode[] }
  | RichListBlock
  | { type: 'blockquote', blocks: RichBlockNode[] }
  | { type: 'code_block', code: string }
  | { type: 'rule' }

interface MarkdownToken {
  type: string
  raw: string
  text?: string
  tokens?: MarkdownToken[]
  items?: MarkdownToken[]
  href?: string
  depth?: number
  ordered?: boolean
  start?: number | ''
  inRawBlock?: boolean
}

// Reuse the same lexer as the challenge editor and never ask it to render HTML.
const markdown = new MarkdownManager().instance
const blockedHtml = /^(?:script|style|iframe|object|embed|svg|math|form|textarea|select|option|button)$/i
const inlineHtml = /^(?:strong|b|em|i|s|del|strike|code|a|u)$/i
const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

function decodeEntities(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, name: string) => {
    if (!name.startsWith('#')) return entities[name.toLowerCase()] ?? entity
    const hex = name[1]?.toLowerCase() === 'x'
    const value = Number.parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10)
    return value > 0 && value <= 0x10FFFF && (value < 0xD800 || value > 0xDFFF)
      ? String.fromCodePoint(value)
      : entity
  })
}

function safeLink(href: string, children: RichInlineNode[]): RichInlineNode[] {
  const raw = decodeEntities(href).trim()
  if (!raw || /\s/u.test(raw) || Array.from(raw).some(char => char.charCodeAt(0) < 33 || char.charCodeAt(0) === 127)) return children
  try {
    const url = new URL(raw)
    if (url.protocol === 'https:' && !url.username && !url.password) {
      return [{ type: 'link', href: url.href, children }]
    }
  } catch {
    // Invalid URLs are displayed as plain link labels.
  }
  return children
}

function legacyNodes(html: string): Node[] {
  return (parse(html) as DocumentNode).children
}

function wrapLegacy(node: ElementNode, children: RichInlineNode[]): RichInlineNode[] {
  switch (node.name.toLowerCase()) {
    case 'b':
    case 'strong':
      return [{ type: 'strong', children }]
    case 'i':
    case 'em':
      return [{ type: 'em', children }]
    case 'del':
    case 's':
    case 'strike':
      return [{ type: 'strike', children }]
    case 'code':
      return [{ type: 'code', text: legacyText(node.children) }]
    case 'a':
      return safeLink(node.attributes.href ?? '', children)
    default:
      return children
  }
}

function legacyText(nodes: Node[]): string {
  return nodes.map((node) => {
    if (node.type === TEXT_NODE) return decodeEntities(node.value)
    if (node.type !== ELEMENT_NODE || blockedHtml.test(node.name)) return ''
    return legacyText(node.children)
  }).join('')
}

function legacyInlines(nodes: Node[]): RichInlineNode[] {
  return nodes.flatMap((node): RichInlineNode[] => {
    if (node.type === TEXT_NODE) return [{ type: 'text', text: decodeEntities(node.value) }]
    if (node.type !== ELEMENT_NODE || blockedHtml.test(node.name)) return []
    if (node.name.toLowerCase() === 'br') return [{ type: 'break' }]
    return wrapLegacy(node, legacyInlines(node.children))
  })
}

function legacyBlocks(nodes: Node[]): RichBlockNode[] {
  const blocks: RichBlockNode[] = []
  let inlines: RichInlineNode[] = []
  const flush = () => {
    if (inlines.length) blocks.push({ type: 'paragraph', inlines })
    inlines = []
  }

  for (const node of nodes) {
    if (node.type === TEXT_NODE && !node.value.trim() && !inlines.length) continue
    if (node.type !== ELEMENT_NODE) {
      inlines.push(...legacyInlines([node]))
      continue
    }

    const tag = node.name.toLowerCase()
    if (blockedHtml.test(tag)) continue
    if (!/^(?:h[1-6]|p|div|blockquote|pre|ol|ul|hr)$/.test(tag)) {
      inlines.push(...legacyInlines([node]))
      continue
    }

    flush()
    if (/^h[1-6]$/.test(tag)) {
      blocks.push({ type: 'heading', level: Number(tag[1]) <= 3 ? 3 : 4, inlines: legacyInlines(node.children) })
    } else if (tag === 'pre') {
      blocks.push({ type: 'code_block', code: legacyText(node.children) })
    } else if (tag === 'blockquote') {
      blocks.push({ type: 'blockquote', blocks: legacyBlocks(node.children) })
    } else if (tag === 'hr') {
      blocks.push({ type: 'rule' })
    } else if (tag === 'ol' || tag === 'ul') {
      const start = Number(node.attributes.start ?? 1)
      blocks.push({
        type: 'list',
        ordered: tag === 'ol',
        ...(Number.isSafeInteger(start) && start !== 1 ? { start } : {}),
        items: node.children.flatMap(child =>
          child.type === ELEMENT_NODE && child.name.toLowerCase() === 'li' ? [legacyBlocks(child.children)] : [],
        ),
      })
    } else {
      blocks.push(...legacyBlocks(node.children))
    }
  }
  flush()
  return blocks
}

function markdownInlines(tokens: MarkdownToken[]): RichInlineNode[] {
  const nodes: RichInlineNode[] = []
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!
    switch (token.type) {
      case 'strong':
      case 'em':
      case 'del':
        nodes.push({ type: token.type === 'del' ? 'strike' : token.type, children: markdownInlines(token.tokens ?? []) })
        break
      case 'codespan':
        nodes.push({ type: 'code', text: token.text ?? '' })
        break
      case 'br':
        nodes.push({ type: 'break' })
        break
      case 'link':
        nodes.push(...safeLink(token.href ?? '', markdownInlines(token.tokens ?? [])))
        break
      case 'html': {
        const tag = /^<([a-z][\w-]*)\b/i.exec(token.raw)?.[1]?.toLowerCase()
        if (!tag) break
        if (tag === 'br') nodes.push({ type: 'break' })
        if (!inlineHtml.test(tag) && !blockedHtml.test(tag)) break
        const close = tokens.findIndex((item, i) =>
          i > index && item.type === 'html' && item.raw.toLowerCase().trim() === '</' + tag + '>',
        )
        if (close < 0) break
        if (inlineHtml.test(tag)) {
          const element = legacyNodes(token.raw + '</' + tag + '>')[0]
          if (element?.type === ELEMENT_NODE) {
            if (tag === 'code') {
              const code = tokens.slice(index + 1, close).map(item => item.raw).join('')
              nodes.push({ type: 'code', text: decodeEntities(code) })
            } else {
              nodes.push(...wrapLegacy(element, markdownInlines(tokens.slice(index + 1, close))))
            }
          }
        }
        index = close
        break
      }
      default:
        if (token.inRawBlock) break
        if (token.tokens?.length) {
          nodes.push(...markdownInlines(token.tokens))
        } else {
          nodes.push({ type: 'text', text: decodeEntities(token.text ?? token.raw) })
        }
    }
  }
  return nodes
}

function markdownBlocks(tokens: MarkdownToken[]): RichBlockNode[] {
  return tokens.flatMap((token): RichBlockNode[] => {
    switch (token.type) {
      case 'space':
        return []
      case 'heading':
        return [{ type: 'heading', level: (token.depth ?? 1) <= 3 ? 3 : 4, inlines: markdownInlines(token.tokens ?? []) }]
      case 'code':
        return [{ type: 'code_block', code: token.text ?? '' }]
      case 'blockquote':
        return [{ type: 'blockquote', blocks: markdownBlocks(token.tokens ?? []) }]
      case 'hr':
        return [{ type: 'rule' }]
      case 'list':
        return [{
          type: 'list',
          ordered: Boolean(token.ordered),
          ...(typeof token.start === 'number' && token.start !== 1 ? { start: token.start } : {}),
          items: (token.items ?? []).map(item => markdownBlocks(item.tokens ?? [])),
        }]
      case 'html':
        return legacyBlocks(legacyNodes(token.raw))
      default:
        return [{ type: 'paragraph', inlines: markdownInlines(token.tokens ?? [token]) }]
    }
  })
}

export function parseSafeRichText(raw: string | null | undefined): RichBlockNode[] {
  return raw?.trim() ? markdownBlocks(markdown.lexer(raw)) : []
}
