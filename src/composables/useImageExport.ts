export function useImageExport() {
  const exportToImage = async (selector: string = '#capture') => {
    // Dynamically import html2canvas to only load it when needed
    console.log('Importing canvas library...')
    const { default: html2canvas } = await import('html2canvas-pro')

    // Render the selected area to a canvas
    console.log('Rendering capture area...')

    const element = document.querySelector(selector) as HTMLElement
    if (!element) {
      console.error(`Element with selector "${selector}" not found`)
      return
    }

    html2canvas(element, {
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

  return {
    exportToImage
  }
}
