import type { TierList } from '@/interfaces/tierlist'

export function useJson() {
  // Export the current tier list data to a JSON file
  function exportToJson(data: TierList[]) {
    // Convert the data to JSON
    const jsonData = JSON.stringify(data, null, 2)

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

  // Import a tier list and return a Promise with the parsed data
  function importFromJson(event: Event): Promise<TierList[] | null> {
    return new Promise((resolve, reject) => {
      const input = event.target as HTMLInputElement
      if (input.files && input.files.length > 0) {
        const file = input.files[0]
        const reader = new FileReader()

        reader.onload = (e) => {
          try {
            // Parse the JSON data
            const jsonData = JSON.parse(e.target?.result as string)
            console.log('Imported from JSON:', jsonData)
            resolve(jsonData)
          } catch (exception) {
            console.error('Error parsing JSON:', exception)
            reject(exception)
          }
        }

        reader.readAsText(file)
      }
    })
  }

  return {
    exportToJson,
    importFromJson,
  }
}
