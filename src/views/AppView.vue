<script setup lang="ts">
// Import necessary libraries and components
import { ref, defineAsyncComponent, onMounted, onUnmounted } from 'vue'

import ItemRow from '@/components/ItemRow.vue'
import TierRow from '@/components/TierRow.vue'
import { templates } from '@/data/templates'

import type { Item, Tier, TierList } from '@/interfaces/tierlist'
import InputField from '@/components/InputField.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'

// Initialize the data
const currentId = ref(0)
const data = ref<TierList[]>([
  {
    id: 0,
    name: 'Tier List 1',
    description: 'Sample tier list for demonstration',
    itemDeck: [],
    tiers: templates[1].tiers ?? [],
  },
])

// Dynamically import draggable component for performance
const draggable = defineAsyncComponent(() => import('vuedraggable'))
const drag = ref(false)

// Helper function to generate unique IDs
function generateUniqueId(): number {
  let newId: number
  const allExistingIds = new Set([
    ...data.value[currentId.value].itemDeck.map((item) => item.id),
    ...data.value[currentId.value].tiers.map((tier) => tier.id),
    ...data.value[currentId.value].tiers.flatMap((tier) => tier.items.map((item) => item.id)),
  ])

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

// Export the current tier list to an image
async function exportToImage() {
  // Dynamically import html2canvas to only load it when needed
  console.log('Importing canvas library...')
  const { default: html2canvas } = await import('html2canvas-pro')

  // Render the selected area to a canvas
  console.log('Rendering capture area...')

  html2canvas(document.querySelector('#capture') as HTMLElement, {
    windowWidth: 1152,
  }).then((canvas) => {
    // Download the canvas as an image
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = 'tierlist.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    console.log('Image rendered')
  })
}

// Export the current tier list data to a JSON file
function exportToJson() {
  // Convert the data to JSON
  const jsonData = JSON.stringify(data.value, null, 2)

  // Create a Blob from the JSON data
  const blob = new Blob([jsonData], { type: 'application/json' })

  // Create a link element to download the Blob
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'tierlist.json'

  // Append the link to the body and trigger a click to download
  document.body.appendChild(link)
  link.click()

  // Clean up by removing the link
  document.body.removeChild(link)
  console.log('Exported to JSON:', jsonData)
}

// Import a tier list and overwrite the current data
function importFromJson(event: Event) {
  // Check if the event is a file input change
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    const file = input.files[0]
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        // Parse the JSON data
        const jsonData = JSON.parse(e.target?.result as string)
        // Update the data with the parsed JSON
        data.value = jsonData
        console.log('Imported from JSON:', jsonData)
      } catch (exception) {
        console.error('Error parsing JSON:', exception)
      }
    }
    reader.readAsText(file)
  } else {
    console.warn('No file selected for import')
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

// Lifecycle hooks
onMounted(() => {
  console.log('App mounted')
  console.log('Listening for paste event')
  window.addEventListener('paste', handlePaste)
})
onUnmounted(() => {
  console.log('Removing paste event listener')
  window.removeEventListener('paste', handlePaste)
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
      <PrimaryButton @click="exportToImage">Export to image</PrimaryButton>
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
          @change="importFromJson"
        />
      </div>
      <PrimaryButton @click="exportToJson">Export</PrimaryButton>
    </div>
  </main>
</template>
