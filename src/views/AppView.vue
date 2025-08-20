<script setup lang="ts">
// Import necessary libraries and components
import { ref, watch, defineAsyncComponent, onMounted, onUnmounted } from 'vue'

import { useIndexedDB } from '@/composables/useIndexedDb'
import { useImageExport } from '@/composables/useImageExport'
import { useJson } from '@/composables/useJson'

import ItemRow from '@/components/ItemRow.vue'
import TierRow from '@/components/TierRow.vue'
import { templates } from '@/data/templates'

import type { Item, Tier, TierList } from '@/interfaces/tierlist'
import InputField from '@/components/InputField.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'

// Initialize the storage composable
const { saveData, loadData } = useIndexedDB()
const { exportToImage } = useImageExport()
const { exportToJson, importFromJson } = useJson()

// Initialize the data
const currentId = ref(0)
const dataTemplate = {
  id: Date.now(),
  name: 'Tier List 1',
  description: 'Sample tier list for demonstration',
  itemDeck: [],
  tiers: structuredClone(templates[1].tiers ?? []),
}
const data = ref<TierList[]>([structuredClone(dataTemplate)])

// Dynamically import draggable component for performance
const draggable = defineAsyncComponent(() => import('vuedraggable'))
const drag = ref(false)

// Helper function to generate unique IDs
function generateUniqueId(): number {
  let newId: number

  if (data.value.length === 0) {
    return Date.now()
  }

  const allExistingIds = new Set([
    ...data.value[currentId.value].itemDeck.map((item) => item.id),
    ...data.value[currentId.value].tiers.map((tier) => tier.id),
    ...data.value[currentId.value].tiers.flatMap((tier) => tier.items.map((item) => item.id)),
  ])

  // Loop until ID is unique
  do {
    newId = Date.now()
  } while (allExistingIds.has(newId))

  return newId
}

// Add a new tier to the current tier list
function addTier() {
  const newTier: Tier = {
    id: generateUniqueId(),
    label: 'New Tier',
    colorHex: '#fff',
    items: [],
  }
  data.value[currentId.value].tiers.push(newTier)
  console.log(`Added new tier: ${newTier.label}`)
  console.log(`Current tiers:`, data.value[currentId.value].tiers)
}

// Upload image from clipboard and create a new item
async function handlePaste() {
  try {
    // Read from the clipboard
    console.log('Reading from clipboard...')
    const clipboardContents = await navigator.clipboard.read()
    for (const item of clipboardContents) {
      // Check if the item contains image data
      const supportedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
      const imageType = supportedTypes.find((type) => item.types.includes(type))
      if (!imageType) {
        throw new Error('Clipboard does not contain a supported image format')
      }

      // Get the first image item
      const blob = await item.getType('image/png')
      const reader = new FileReader()
      reader.onload = () => {
        // Create new item with base64 image data
        createItem('', reader.result as string)
      }
      reader.readAsDataURL(blob)
      return
    }
  } catch (exception) {
    console.error('Failed to paste from clipboard:', exception)
  }
}

// Create a new item in the item deck
function createItem(label: string, image: string) {
  // Initialise a new item
  const newItem: Item = {
    id: generateUniqueId(),
    label: label,
    image: image,
  }

  // Push it to the item deck
  data.value[currentId.value].itemDeck.push(newItem)

  // Log the new item
  console.log(`Created new item: ${newItem.id}`)
  console.log(`Current item deck:`, data.value[currentId.value].itemDeck)
}

// Updated import function to handle the Promise
async function handleImportFromJson(event: Event) {
  try {
    const importedData = await importFromJson(event)
    if (importedData) {
      data.value = importedData
    }
  } catch (error) {
    console.error('Failed to import JSON:', error)
    // You could show an error message to the user here
  }
}

// Delete a tier from the tier list
function onDeleteTier(id: string) {
  // Move any items from the tier to the item deck
  const tier = data.value[currentId.value].tiers.find((tier) => tier.id === Number(id))
  if (tier) {
    data.value[currentId.value].itemDeck.push(...tier.items)
    console.log(`Moved items from tier ${id} to item deck`)
  } else {
    console.warn(`Tier with id ${id} not found`)
    return
  }

  // Delete the tier from the list
  data.value[currentId.value].tiers = data.value[currentId.value].tiers.filter(
    (tier) => tier.id !== Number(id),
  )
  console.log(`Tier with id ${id} deleted`)
}

// Clear all data if confirmed
function clearData() {
  if (confirm('Are you sure you want to clear all data?')) {
    data.value = [structuredClone(dataTemplate)]
    console.log('All data cleared')
  }
}

// Handle export image function
function handleExportToImage() {
  exportToImage()
}

// Handle export function
function handleExportToJson() {
  exportToJson(data.value)
}

// Watch for changes in the data and save to IndexedDB
let saveTimeout: number | null = null
watch(
  data,
  () => {
    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }

    // Set new timeout to save after 1 second of no changes
    saveTimeout = setTimeout(() => {
      saveData(data.value)
    }, 1000)
  },
  // Deep allows watching nested properties
  { deep: true },
)

// Lifecycle hooks
onMounted(async () => {
  console.log('App mounted')
  console.log('Listening for paste event')
  window.addEventListener('paste', handlePaste)

  try {
    const savedData = await loadData()
    if (savedData) {
      data.value = savedData
    }
  } catch (err) {
    console.error('Failed to load data on mount:', err)
  }
})

onUnmounted(async () => {
  console.log('Removing paste event listener')
  window.removeEventListener('paste', handlePaste)

  // Clear any pending save timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }

  // Save one final time before unmounting
  try {
    await saveData(data.value)
  } catch (err) {
    console.error('Failed to save data on unmount:', err)
  }
})
</script>

<template>
  <main class="w-11/12 max-w-6xl m-auto">
    <InputField class="mb-8" v-model:value="data[currentId].name" />
    <!-- Draggable tiers -->
    <div id="capture">
      <draggable
        v-model="data[currentId].tiers"
        group="tiers"
        @start="drag = true"
        @end="drag = false"
        item-key="id"
        handle=".handle"
        class="flex flex-col"
      >
        <template #item="{ element }">
          <TierRow :tier="element" @delete="onDeleteTier" />
        </template>
      </draggable>
    </div>
    <PrimaryButton class="mb-8" @click="addTier">New Tier</PrimaryButton>
    <!-- Item deck -->
    <ItemRow v-model="data[currentId].itemDeck" :draggable="drag" />
    <PrimaryButton class="mb-8" @click="createItem('', '')">Add Item</PrimaryButton>
    <div class="md:grid grid-cols-3 gap-4">
      <PrimaryButton @click="handleExportToImage">Export to image</PrimaryButton>
      <div>
        <label
          for="import-json"
          class="block w-full p-2 border-2 rounded-md text-center border-gray-500 bg-gray-900 hover:bg-gray-800 hover:cursor-pointer"
        >
          Import
        </label>
        <input
          type="file"
          id="import-json"
          class="hidden border p-2"
          accept=".json"
          @change="handleImportFromJson"
        />
      </div>
      <PrimaryButton @click="handleExportToJson">Export</PrimaryButton>
      <PrimaryButton @click="clearData">Clear</PrimaryButton>
    </div>
  </main>
</template>
