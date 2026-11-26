<script setup lang="ts">
import { type VNodeChild, computed, h } from 'vue'
import {
  type RichInlineNode,
  type RichBlockNode,
  parseSafeRichText,
} from '~/utils/safeRichText'

const props = defineProps<{
  content: string | null | undefined
}>()

const blocks = computed(() => parseSafeRichText(props.content))

function renderInlineNodes(nodes: RichInlineNode[]): VNodeChild[] {
  return nodes.map((node) => {
    switch (node.type) {
      case 'strong':
        return h('strong', { class: 'font-black text-text-main' }, renderInlineNodes(node.children))
      case 'em':
        return h('em', { class: 'italic' }, renderInlineNodes(node.children))
      case 'strike':
        return h('s', renderInlineNodes(node.children))
      case 'break':
        return h('br')
      case 'code':
        return h(
          'code',
          {
            class: 'rounded-md border border-neutral-900/15 bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.85em] font-semibold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100',
          },
          node.text,
        )
      case 'link':
        return h(
          'a',
          {
            href: node.href,
            target: '_blank',
            rel: 'noopener noreferrer',
            class: 'font-bold text-institutional-600 underline decoration-2 underline-offset-2 hover:text-institutional-700 dark:text-institutional-400',
          },
          renderInlineNodes(node.children),
        )
      case 'text':
      default:
        return node.text
    }
  })
}

function renderBlocks(nodes: RichBlockNode[], nested = false): VNodeChild[] {
  return nodes.map((block) => {
    switch (block.type) {
      case 'heading':
        return h(block.level === 3 ? 'h3' : 'h4', {
          class: block.level === 3
            ? 'mt-6 first:mt-0 text-lg sm:text-xl font-black tracking-tight text-text-main'
            : 'mt-5 first:mt-0 text-base sm:text-lg font-black text-text-main',
        }, renderInlineNodes(block.inlines))
      case 'code_block':
        return h('pre', {
          class: 'overflow-x-auto rounded-2xl border-2 border-neutral-900/20 bg-neutral-900 p-4 font-mono text-xs leading-6 text-neutral-100 dark:border-neutral-700',
        }, h('code', block.code))
      case 'blockquote':
        return h('blockquote', {
          class: 'rounded-r-2xl border-l-4 border-institutional-500 bg-canvas/80 px-4 py-3 text-sm italic leading-relaxed text-text-main dark:bg-neutral-900/70',
        }, renderBlocks(block.blocks, true))
      case 'rule':
        return h('hr', { class: 'border-border-subtle' })
      case 'list': {
        const listStyle = block.ordered ? 'list-decimal' : 'list-disc'
        const spacing = nested ? 'mt-1.5 space-y-1 pl-5' : 'space-y-1.5 pl-5 text-sm leading-7 text-text-muted sm:text-base'
        return h(block.ordered ? 'ol' : 'ul', {
          class: listStyle + ' ' + spacing,
          start: block.ordered ? block.start : undefined,
        }, block.items.map(item => h('li', renderBlocks(item, true))))
      }
      case 'paragraph':
        return h('p', {
          class: nested ? 'break-words' : 'text-sm leading-7 text-text-muted sm:text-base break-words',
        }, renderInlineNodes(block.inlines))
    }
  })
}

function RichContentRenderer(): VNodeChild {
  return renderBlocks(blocks.value)
}
</script>

<template>
  <div class="space-y-3">
    <RichContentRenderer />
  </div>
</template>
