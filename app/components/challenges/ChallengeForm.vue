<script setup lang="ts">
import { computed, nextTick, ref, onMounted, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import type { ChallengeCreatePayload, DifficultyLevel, InitialChallengeStatus, Modality } from '~/types/challenge'
import { useAuth } from '~/composables/useAuth'

interface Props {
  busyAction?: InitialChallengeStatus | null
  locked?: boolean
  initialData?: Partial<ChallengeCreatePayload>
}

const props = withDefaults(defineProps<Props>(), {
  busyAction: null,
  locked: false,
  initialData: () => ({}),
})

const emit = defineEmits<{
  submit: [payload: ChallengeCreatePayload]
}>()

const { companyProfile } = useAuth()

// Form reactive state
const formTitle = ref(props.initialData.title || '')
const formBusinessProcess = ref(props.initialData.business_process || '')
const formEconomicSector = ref(props.initialData.economic_sector || '')
const formModality = ref<Modality>(props.initialData.modality || 'REMOTE')
const formDifficulty = ref<DifficultyLevel>(props.initialData.difficulty_level || 'INTERMEDIATE')
const formMinSemester = ref<number>(props.initialData.min_semester ?? 7)
const formDescription = ref(props.initialData.description || '')
const formSkills = ref<string[]>([...(props.initialData.required_skills || [])])
const formAreas = ref<string[]>([...(props.initialData.knowledge_areas || [])])
const tagInputs = ref({ skills: '', areas: '' })
const tagFields = [
  { key: 'skills', label: 'Habilidades requeridas', removeLabel: 'habilidad', tags: formSkills },
  { key: 'areas', label: 'Áreas de conocimiento', removeLabel: 'área', tags: formAreas },
] as const
type TagField = typeof tagFields[number]
type Field = 'title' | 'business_process' | 'description' | 'economic_sector' | 'modality' | 'difficulty_level' | 'min_semester'
const touched = ref<Partial<Record<Field, boolean>>>({})
const submitted = ref(false)
const descriptionLength = ref(0)

// Modality and Difficulty options
const MODALITY_OPTIONS: { value: Modality; label: string; icon: string }[] = [
  { value: 'REMOTE', label: 'Remoto', icon: '💻' },
  { value: 'HYBRID', label: 'Híbrido', icon: '🔄' },
  { value: 'ON_SITE', label: 'Presencial', icon: '📍' },
]

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string }[] = [
  { value: 'BEGINNER', label: 'Básico' },
  { value: 'INTERMEDIATE', label: 'Intermedio' },
  { value: 'ADVANCED', label: 'Avanzado' },
]

const SEMESTER_OPTIONS = [6, 7, 8, 9, 10]

// Accessible Tiptap attributes generator
function getEditorAttributes(): Record<string, string> {
  const hasError = !!errors.value.description
  return {
    class: 'focus:outline-none min-h-[200px] p-4 text-text-main text-sm leading-relaxed max-w-none',
    role: 'textbox',
    'aria-multiline': 'true',
    'aria-label': 'Descripción de la problemática empresarial',
    'aria-required': 'true',
    'aria-invalid': hasError ? 'true' : 'false',
    'aria-describedby': hasError
      ? 'challenge-description-help challenge-description-count challenge-description-error'
      : 'challenge-description-help challenge-description-count',
  }
}

// Tiptap Editor Initialization
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      codeBlock: {},
      blockquote: {},
    }),
    Markdown.configure({
      indentation: { style: 'space', size: 2 },
    }),
  ],
  content: formDescription.value,
  contentType: 'markdown',
  editorProps: {
    attributes: () => getEditorAttributes(),
  },
  onCreate: ({ editor: activeEditor }) => {
    descriptionLength.value = activeEditor.getText().trim().length
  },
  onUpdate: ({ editor: activeEditor }) => {
    formDescription.value = activeEditor.getMarkdown()
    descriptionLength.value = activeEditor.getText().trim().length
  },
  onBlur: () => {
    touched.value.description = true
  },
})

onMounted(() => {
  if (!formEconomicSector.value && companyProfile.value?.economic_sector) {
    formEconomicSector.value = companyProfile.value.economic_sector
  }
})

function addTags(field: TagField) {
  const tags = field.tags.value
  for (const part of tagInputs.value[field.key].split(',')) {
    const tag = part.trim()
    if (tag && !tags.some(value => value.toLowerCase() === tag.toLowerCase())) {
      tags.push(tag)
    }
  }
  tagInputs.value[field.key] = ''
}

function handleTagKeydown(event: KeyboardEvent, field: TagField) {
  if (!event.isComposing && (event.key === 'Enter' || event.key === ',')) {
    event.preventDefault()
    addTags(field)
  }
}

const validation = computed<Partial<Record<Field, string>>>(() => {
  const issues: Partial<Record<Field, string>> = {}

  const title = formTitle.value.trim()
  if (title.length < 10) {
    issues.title = 'Escribe un título de al menos 10 caracteres.'
  } else if (title.length > 255) {
    issues.title = 'El título no puede superar los 255 caracteres.'
  }

  const businessProcess = formBusinessProcess.value.trim()
  if (businessProcess.length < 5) {
    issues.business_process = 'Escribe un proceso de al menos 5 caracteres.'
  } else if (businessProcess.length > 255) {
    issues.business_process = 'El proceso de negocio no puede superar los 255 caracteres.'
  }

  if (descriptionLength.value < 30) {
    issues.description = 'Escribe una descripción de al menos 30 caracteres.'
  }

  const economicSector = formEconomicSector.value.trim()
  if (!economicSector) {
    issues.economic_sector = 'El sector económico es obligatorio.'
  } else if (economicSector.length > 100) {
    issues.economic_sector = 'El sector económico no puede superar los 100 caracteres.'
  }

  if (!['REMOTE', 'HYBRID', 'ON_SITE'].includes(formModality.value)) {
    issues.modality = 'Selecciona una modalidad válida.'
  }

  if (!['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(formDifficulty.value)) {
    issues.difficulty_level = 'Selecciona un nivel de dificultad válido.'
  }

  const sem = Number(formMinSemester.value)
  if (!Number.isInteger(sem) || sem < 6 || sem > 10) {
    issues.min_semester = 'El semestre mínimo debe ser un número entero entre 6 y 10.'
  }

  return issues
})

const canPublish = computed(() => Object.keys(validation.value).length === 0)
const errors = computed(() => {
  if (submitted.value) return validation.value
  const visible: Partial<Record<Field, string>> = {}
  for (const field of Object.keys(touched.value) as Field[]) {
    visible[field] = validation.value[field]
  }
  return visible
})

const editingDisabled = computed(() => props.locked || !!props.busyAction)
const showPublishHelp = ref(false)
const submittingLocally = ref(false)

watch(
  [editor, editingDisabled, () => errors.value.description],
  ([activeEditor, disabled]) => {
    if (!activeEditor || activeEditor.isDestroyed) return
    activeEditor.setEditable(!disabled, false)
    activeEditor.setOptions({ editorProps: { attributes: getEditorAttributes } })
  },
)

function handleSubmit(status: InitialChallengeStatus) {
  if (editingDisabled.value || submittingLocally.value) return
  submitted.value = true
  if (!canPublish.value) return
  tagFields.forEach(addTags)

  const payload: ChallengeCreatePayload = {
    title: formTitle.value.trim(),
    description: formDescription.value.trim(),
    business_process: formBusinessProcess.value.trim(),
    economic_sector: formEconomicSector.value.trim(),
    modality: formModality.value,
    difficulty_level: formDifficulty.value,
    min_semester: Number(formMinSemester.value),
    required_skills: [...formSkills.value],
    knowledge_areas: [...formAreas.value],
    status,
  }

  submittingLocally.value = true
  emit('submit', payload)
  void nextTick(() => { submittingLocally.value = false })
}
</script>

<template>
  <form class="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start" :aria-busy="!!busyAction" @submit.prevent>
    <!-- BLOQUE 1: INFORMACIÓN CENTRAL DEL RETO -->
    <section
      :inert="editingDisabled"
      class="bg-surface border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.12)] space-y-6"
    >
      <div class="border-b-2 border-border-subtle pb-4">
        <h2 class="text-xl font-black text-text-main tracking-tight uppercase">
          Información del reto
        </h2>
        <p class="text-xs sm:text-sm text-text-muted mt-1 font-medium">
          Define el título principal, el área operativa y el detalle técnico de la problemática.
        </p>
      </div>

      <!-- Título del Reto -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label for="challenge-title" class="text-xs font-black uppercase tracking-wider text-text-main">
            Título del Reto <span class="text-institutional-500">*</span>
          </label>
          <span class="text-xs font-bold text-text-muted">
            {{ formTitle.length }} / 255
          </span>
        </div>
        <input
          id="challenge-title"
          v-model="formTitle"
          type="text"
          maxlength="255"
          aria-required="true"
          :aria-invalid="errors.title ? 'true' : 'false'"
          :aria-describedby="errors.title ? 'challenge-title-error' : undefined"
          placeholder="p. ej., Sistema de Telemetría y Gestión de Inventarios Multi-Bodega"
          :class="[
            errors.title
              ? 'border-red-500 ring-2 ring-institutional-500/20'
              : 'border-neutral-900 dark:border-neutral-700 focus:border-institutional-500 focus:ring-2 focus:ring-institutional-500/20',
            'w-full px-4 py-3 rounded-2xl bg-canvas border-2 text-text-main font-bold text-sm sm:text-base outline-none transition-all placeholder:text-text-muted/60',
          ]"
          @blur="touched.title = true"
        >
        <p
          v-if="errors.title"
          id="challenge-title-error"
          role="alert"
          class="text-xs font-bold text-institutional-600 dark:text-institutional-400"
        >
          {{ errors.title }}
        </p>
      </div>

      <!-- Proceso de Negocio Afectado -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label for="challenge-process" class="text-xs font-black uppercase tracking-wider text-text-main">
            Proceso de Negocio o Área Operativa <span class="text-institutional-500">*</span>
          </label>
          <span class="text-xs font-bold text-text-muted">
            {{ formBusinessProcess.length }} / 255
          </span>
        </div>
        <input
          id="challenge-process"
          v-model="formBusinessProcess"
          type="text"
          maxlength="255"
          aria-required="true"
          :aria-invalid="errors.business_process ? 'true' : 'false'"
          :aria-describedby="errors.business_process ? 'challenge-process-error' : undefined"
          placeholder="p. ej., Logística, Cadena de Suministro, Facturación Electrónica"
          :class="[
            errors.business_process
              ? 'border-red-500 ring-2 ring-institutional-500/20'
              : 'border-neutral-900 dark:border-neutral-700 focus:border-institutional-500 focus:ring-2 focus:ring-institutional-500/20',
            'w-full px-4 py-3 rounded-2xl bg-canvas border-2 text-text-main font-bold text-sm outline-none transition-all placeholder:text-text-muted/60',
          ]"
          @blur="touched.business_process = true"
        >
        <p
          v-if="errors.business_process"
          id="challenge-process-error"
          role="alert"
          class="text-xs font-bold text-institutional-600 dark:text-institutional-400"
        >
          {{ errors.business_process }}
        </p>
      </div>

      <!-- Descripción Detallada con Tiptap (Markdown) -->
      <div class="space-y-2">
        <label class="text-xs font-black uppercase tracking-wider text-text-main">
          Descripción Detallada de la Problemática (Markdown) <span class="text-institutional-500">*</span>
        </label>
        <p id="challenge-description-help" class="text-xs text-text-muted font-medium">
          Describe la situación actual, los objetivos funcionales, restricciones y entregables esperados.
        </p>

        <!-- Editor Tiptap con Toolbar Modular y ClientOnly para SSR -->
        <ClientOnly>
          <div
            :class="[
              errors.description
                ? 'border-red-500 ring-2 ring-institutional-500/20'
                : 'border-neutral-900 dark:border-neutral-700',
              'border-2 rounded-2xl bg-canvas overflow-hidden focus-within:ring-2 focus-within:ring-institutional-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.06)]',
            ]"
          >
            <!-- Toolbar Tiptap -->
            <div
              v-if="editor"
              class="flex flex-wrap items-center gap-1 p-2 bg-surface border-b-2 border-neutral-900 dark:border-neutral-700"
              role="toolbar"
              aria-label="Herramientas de edición de texto"
            >
              <button
                type="button"
                :class="[
                  editor.isActive('bold')
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                    : 'text-text-muted hover:text-text-main hover:bg-canvas',
                  'px-2.5 py-1.5 rounded-lg text-xs font-black transition-all',
                ]"
                aria-label="Negrita"
                @click="editor.chain().focus().toggleBold().run()"
              >
                B
              </button>

              <button
                type="button"
                :class="[
                  editor.isActive('italic')
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                    : 'text-text-muted hover:text-text-main hover:bg-canvas',
                  'px-2.5 py-1.5 rounded-lg text-xs font-black italic transition-all',
                ]"
                aria-label="Cursiva"
                @click="editor.chain().focus().toggleItalic().run()"
              >
                I
              </button>

              <span class="w-px h-5 bg-border-subtle mx-1" />

              <button
                type="button"
                :class="[
                  editor.isActive('heading', { level: 2 })
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                    : 'text-text-muted hover:text-text-main hover:bg-canvas',
                  'px-2.5 py-1.5 rounded-lg text-xs font-black transition-all',
                ]"
                aria-label="Título 2"
                @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
              >
                H2
              </button>

              <button
                type="button"
                :class="[
                  editor.isActive('heading', { level: 3 })
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                    : 'text-text-muted hover:text-text-main hover:bg-canvas',
                  'px-2.5 py-1.5 rounded-lg text-xs font-black transition-all',
                ]"
                aria-label="Título 3"
                @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
              >
                H3
              </button>

              <span class="w-px h-5 bg-border-subtle mx-1" />

              <button
                type="button"
                :class="[
                  editor.isActive('bulletList')
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                    : 'text-text-muted hover:text-text-main hover:bg-canvas',
                  'px-2.5 py-1.5 rounded-lg text-xs font-black transition-all',
                ]"
                aria-label="Lista con viñetas"
                @click="editor.chain().focus().toggleBulletList().run()"
              >
                • Lista
              </button>

              <button
                type="button"
                :class="[
                  editor.isActive('orderedList')
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                    : 'text-text-muted hover:text-text-main hover:bg-canvas',
                  'px-2.5 py-1.5 rounded-lg text-xs font-black transition-all',
                ]"
                aria-label="Lista numerada"
                @click="editor.chain().focus().toggleOrderedList().run()"
              >
                1. Num
              </button>

              <span class="w-px h-5 bg-border-subtle mx-1" />

              <button
                type="button"
                :class="[
                  editor.isActive('codeBlock')
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                    : 'text-text-muted hover:text-text-main hover:bg-canvas',
                  'px-2.5 py-1.5 rounded-lg text-xs font-black font-mono transition-all',
                ]"
                aria-label="Bloque de código"
                @click="editor.chain().focus().toggleCodeBlock().run()"
              >
                &lt;/&gt;
              </button>

              <button
                type="button"
                :class="[
                  editor.isActive('blockquote')
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                    : 'text-text-muted hover:text-text-main hover:bg-canvas',
                  'px-2.5 py-1.5 rounded-lg text-xs font-black transition-all',
                ]"
                aria-label="Cita"
                @click="editor.chain().focus().toggleBlockquote().run()"
              >
                “ Cita
              </button>

              <span class="w-px h-5 bg-border-subtle mx-1" />

              <button
                type="button"
                :disabled="!editor.can().undo()"
                class="px-2 py-1.5 rounded-lg text-xs font-black text-text-muted hover:text-text-main hover:bg-canvas disabled:opacity-40 transition-all"
                aria-label="Deshacer"
                @click="editor.chain().focus().undo().run()"
              >
                ↩
              </button>

              <button
                type="button"
                :disabled="!editor.can().redo()"
                class="px-2 py-1.5 rounded-lg text-xs font-black text-text-muted hover:text-text-main hover:bg-canvas disabled:opacity-40 transition-all"
                aria-label="Rehacer"
                @click="editor.chain().focus().redo().run()"
              >
                ↪
              </button>
            </div>

            <!-- Cuerpo del editor -->
            <EditorContent :editor="editor" />
          </div>

          <template #fallback>
            <div class="h-48 rounded-2xl border-2 border-neutral-900/20 dark:border-neutral-700/30 bg-canvas animate-pulse flex items-center justify-center text-text-muted text-sm font-bold">
              Cargando editor de texto estructurado...
            </div>
          </template>
        </ClientOnly>

        <p
          id="challenge-description-count"
          class="text-xs font-bold"
          :class="descriptionLength >= 30 ? 'text-emerald-700 dark:text-emerald-400' : 'text-text-muted'"
        >
          {{ descriptionLength }} caracteres · mínimo 30
        </p>
        <p
          v-if="errors.description"
          id="challenge-description-error"
          role="alert"
          class="text-xs font-bold text-institutional-600 dark:text-institutional-400"
        >
          {{ errors.description }}
        </p>
      </div>
    </section>

    <div class="min-w-0 space-y-6" :inert="editingDisabled">
    <!-- BLOQUE 2: CONTEXTO EMPRESARIAL -->
    <section
      class="bg-surface border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.12)] space-y-6"
    >
      <div class="border-b-2 border-border-subtle pb-4 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-black text-text-main tracking-tight uppercase">
            Contexto empresarial
          </h2>
          <p class="text-xs sm:text-sm text-text-muted mt-1 font-medium">
            Clasificación sectorial para la postulación y búsqueda de estudiantes afines.
          </p>
        </div>
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-pastel-coral dark:bg-pastel-coral/25 text-neutral-900 dark:text-neutral-100 border border-neutral-900/30 dark:border-neutral-600">
          🏢 Sector PYME
        </span>
      </div>

      <!-- Sector Económico -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label for="challenge-sector" class="text-xs font-black uppercase tracking-wider text-text-main">
            Sector Económico de la Empresa <span class="text-institutional-500">*</span>
          </label>
          <span class="text-xs font-bold text-text-muted">
            {{ formEconomicSector.length }} / 100
          </span>
        </div>
        <input
          id="challenge-sector"
          v-model="formEconomicSector"
          type="text"
          maxlength="100"
          aria-required="true"
          :aria-invalid="errors.economic_sector ? 'true' : 'false'"
          :aria-describedby="errors.economic_sector ? 'challenge-sector-error' : undefined"
          placeholder="p. ej., Agroindustria, Software & Cloud, Comercio Electrónico, Salud"
          :class="[
            errors.economic_sector
              ? 'border-red-500 ring-2 ring-institutional-500/20'
              : 'border-neutral-900 dark:border-neutral-700 focus:border-institutional-500 focus:ring-2 focus:ring-institutional-500/20',
            'w-full px-4 py-3 rounded-2xl bg-canvas border-2 text-text-main font-bold text-sm outline-none transition-all placeholder:text-text-muted/60',
          ]"
          @blur="touched.economic_sector = true"
        >
        <p
          v-if="errors.economic_sector"
          id="challenge-sector-error"
          role="alert"
          class="text-xs font-bold text-institutional-600 dark:text-institutional-400"
        >
          {{ errors.economic_sector }}
        </p>
      </div>
    </section>

    <!-- BLOQUE 3: CONDICIONES Y NIVEL ACADÉMICO -->
    <section
      class="bg-surface border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.12)] space-y-6"
    >
      <div class="border-b-2 border-border-subtle pb-4 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-black text-text-main tracking-tight uppercase">
            Requisitos académicos
          </h2>
          <p class="text-xs sm:text-sm text-text-muted mt-1 font-medium">
            Establece los requisitos mínimos de vinculación con los estudiantes de la UFPS.
          </p>
        </div>
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-pastel-blue dark:bg-pastel-blue/20 text-neutral-900 dark:text-neutral-100 border border-neutral-900/30 dark:border-neutral-600">
          🎓 Requisito UFPS
        </span>
      </div>

      <div class="grid grid-cols-1 gap-6">
        <!-- Modalidad de Ejecución -->
        <div class="space-y-2.5">
          <label class="text-xs font-black uppercase tracking-wider text-text-main">
            Modalidad de Trabajo <span class="text-institutional-500">*</span>
          </label>
          <div role="radiogroup" aria-label="Modalidad de trabajo" class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in MODALITY_OPTIONS"
              :key="opt.value"
              type="button"
              role="radio"
              :aria-checked="formModality === opt.value"
              :class="[
                formModality === opt.value
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-canvas text-text-muted hover:text-text-main',
                'min-h-[44px] p-2.5 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500',
              ]"
              @click="formModality = opt.value"
            >
              <span>{{ opt.icon }}</span>
              <span>{{ opt.label }}</span>
            </button>
          </div>
          <p v-if="errors.modality" role="alert" class="text-xs font-bold text-institutional-600 dark:text-institutional-400">
            {{ errors.modality }}
          </p>
        </div>

        <!-- Nivel de Dificultad -->
        <div class="space-y-2.5">
          <label class="text-xs font-black uppercase tracking-wider text-text-main">
            Complejidad Estimada <span class="text-institutional-500">*</span>
          </label>
          <div role="radiogroup" aria-label="Nivel de dificultad" class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in DIFFICULTY_OPTIONS"
              :key="opt.value"
              type="button"
              role="radio"
              :aria-checked="formDifficulty === opt.value"
              :class="[
                formDifficulty === opt.value
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-canvas text-text-muted hover:text-text-main',
                'min-h-[44px] p-2.5 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 text-xs font-black transition-all flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500',
              ]"
              @click="formDifficulty = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
          <p v-if="errors.difficulty_level" role="alert" class="text-xs font-bold text-institutional-600 dark:text-institutional-400">
            {{ errors.difficulty_level }}
          </p>
        </div>
      </div>

      <!-- Semestre Mínimo Requerido -->
      <div class="space-y-2.5 pt-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-black uppercase tracking-wider text-text-main">
            Semestre Mínimo Habilitado (6.º a 10.º) <span class="text-institutional-500">*</span>
          </label>
          <span class="text-xs font-bold text-text-muted">
            Estudiantes UFPS elegibles: Semestre {{ formMinSemester }}.º en adelante
          </span>
        </div>

        <div role="radiogroup" aria-label="Semestre mínimo" class="grid grid-cols-5 gap-2 sm:gap-3">
          <button
            v-for="sem in SEMESTER_OPTIONS"
            :key="sem"
            type="button"
            role="radio"
            :aria-checked="formMinSemester === sem"
            :class="[
              formMinSemester === sem
                ? 'bg-pastel-blue dark:bg-pastel-blue/30 text-neutral-900 dark:text-neutral-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]'
                : 'bg-canvas text-text-muted hover:text-text-main',
              'min-h-[44px] py-2.5 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500',
            ]"
            @click="formMinSemester = sem"
          >
            <span>Sem. {{ sem }}.º</span>
          </button>
        </div>
        <p v-if="errors.min_semester" role="alert" class="text-xs font-bold text-institutional-600 dark:text-institutional-400">
          {{ errors.min_semester }}
        </p>
      </div>
    </section>

    <!-- BLOQUE 4: COMPETENCIAS Y HABILIDADES REQUERIDAS -->
    <section
      class="bg-surface border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.12)] space-y-6"
    >
      <div class="border-b-2 border-border-subtle pb-4 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-black text-text-main tracking-tight uppercase">
            Habilidades y conocimiento
          </h2>
          <p class="text-xs sm:text-sm text-text-muted mt-1 font-medium">
            Agrega las herramientas, lenguajes o tecnologías recomendadas para este reto.
          </p>
        </div>
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-pastel-mint/40 dark:bg-pastel-mint/20 text-neutral-900 dark:text-neutral-100 border border-neutral-900/30 dark:border-neutral-600">
          ⚡ Stack Técnico
        </span>
      </div>

      <div v-for="field in tagFields" :key="field.key" class="space-y-3">
        <label :for="`challenge-tags-${field.key}`" class="text-xs font-black uppercase tracking-wider text-text-main">
          {{ field.label }}
        </label>
        <div class="flex items-center gap-2">
          <input
            :id="`challenge-tags-${field.key}`"
            v-model="tagInputs[field.key]"
            type="text"
            :aria-describedby="`challenge-tags-${field.key}-help`"
            class="min-w-0 flex-1 rounded-2xl border-2 border-neutral-900 bg-canvas px-3 py-3 text-sm font-bold text-text-main outline-none focus:ring-2 focus:ring-institutional-500 dark:border-neutral-700"
            @keydown="handleTagKeydown($event, field)"
          >
          <button
            type="button"
            class="min-h-[44px] px-5 rounded-2xl bg-surface hover:bg-canvas border-2 border-neutral-900 dark:border-neutral-700 text-text-main font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.06)] active:translate-x-[1px] active:translate-y-[1px] transition-all"
            :aria-label="`Agregar ${field.removeLabel}`"
            @click="addTags(field)"
          >
            Agregar
          </button>
        </div>

        <p :id="`challenge-tags-${field.key}-help`" class="text-xs text-text-muted">
          Separa las etiquetas con Enter o coma.
        </p>
        <ul v-if="field.tags.value.length" class="flex flex-wrap gap-2">
          <li
            v-for="(tag, index) in field.tags.value"
            :key="tag"
            class="inline-flex max-w-full items-center gap-1 rounded-xl border border-border-subtle bg-pastel-mint/35 px-2 text-xs font-bold dark:bg-pastel-mint/15"
          >
            <span class="min-w-0 break-all">{{ tag }}</span>
            <button
              type="button"
              class="min-h-8 min-w-8 rounded-full text-text-muted hover:bg-canvas focus-visible:ring-2 focus-visible:ring-institutional-500"
              :aria-label="`Eliminar ${field.removeLabel} ${tag}`"
              @click="field.tags.value.splice(index, 1)"
            >
              <span aria-hidden="true">×</span>
            </button>
          </li>
        </ul>
      </div>
    </section>
    </div>

    <!-- BARRA DE ACCIÓN INFERIOR (ACTION DOCK) -->
    <div
      class="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 rounded-2xl border-2 border-neutral-900 bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-neutral-700 lg:static lg:col-start-2"
    >
      <p v-if="busyAction" role="status" class="flex w-full items-center gap-2 text-sm font-bold">
        <span class="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" aria-hidden="true" />
        {{ busyAction === 'DRAFT' ? 'Guardando el borrador…' : 'Guardando el borrador para publicar…' }}
      </p>
      <!-- Botón Guardar Borrador (DRAFT) -->
      <button
        type="button"
        :disabled="editingDisabled"
        class="min-h-11 flex-1 rounded-xl border-2 border-neutral-900 px-3 py-2 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-institutional-500 disabled:opacity-50 dark:border-neutral-700"
        @click="handleSubmit('DRAFT')"
      >
        Guardar borrador
      </button>

      <!-- Botón Publicar Reto (OPEN) -->
      <div
        class="group relative flex flex-1 rounded-xl"
      >
        <button
          v-if="canPublish || editingDisabled"
          type="button"
          :disabled="editingDisabled"
          class="min-h-11 w-full rounded-xl bg-institutional-600 px-3 py-2 text-sm font-black text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-institutional-500 disabled:opacity-50"
          @click="handleSubmit('OPEN')"
        >
          Publicar reto
        </button>
        <button
          v-else
          type="button"
          aria-disabled="true"
          aria-describedby="publish-help"
          class="min-h-11 w-full rounded-xl bg-institutional-600 px-3 py-2 text-sm font-black text-white opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-institutional-500"
          @click="showPublishHelp = !showPublishHelp"
          @blur="showPublishHelp = false"
          @keydown.esc="showPublishHelp = false"
        >
          Publicar reto
        </button>
        <p
          v-if="!canPublish && !editingDisabled"
          id="publish-help"
          role="tooltip"
          class="pointer-events-none absolute right-0 bottom-full mb-2 w-max max-w-56 rounded-lg border border-border-subtle bg-surface p-2 text-xs font-medium text-text-main"
          :class="showPublishHelp ? 'block' : 'sr-only group-hover:not-sr-only group-hover:absolute group-focus-within:not-sr-only group-focus-within:absolute'"
        >
          Completa los campos obligatorios para publicar el reto.
        </p>
      </div>
    </div>
  </form>
</template>

<style scoped>
:deep(.tiptap) {
  min-height: 200px;
  outline: none;
}
:deep(.tiptap p) {
  margin-bottom: 0.75rem;
}
:deep(.tiptap h2) {
  font-size: 1.25rem;
  font-weight: 800;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}
:deep(.tiptap h3) {
  font-size: 1.1rem;
  font-weight: 700;
  margin-top: 0.75rem;
  margin-bottom: 0.35rem;
}
:deep(.tiptap ul) {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}
:deep(.tiptap ol) {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}
:deep(.tiptap blockquote) {
  border-left: 3px solid currentColor;
  padding-left: 1rem;
  font-style: italic;
  margin: 0.75rem 0;
  opacity: 0.85;
}
:deep(.tiptap pre) {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  font-family: monospace;
  font-size: 0.85rem;
  overflow-x: auto;
  margin: 0.75rem 0;
}
:deep(.dark .tiptap pre) {
  background-color: rgba(255, 255, 255, 0.06);
}
:deep(.tiptap code) {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.15rem 0.35rem;
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.85rem;
}
:deep(.dark .tiptap code) {
  background-color: rgba(255, 255, 255, 0.08);
}
</style>
