import { openDB } from 'idb'
import type { TierList } from '@/interfaces/tierlist'

export function useIndexedDB() {
  const DB_NAME = 'tierListDB'
  const DB_VERSION = 1
  const STORE_NAME = 'tierLists'
  const KEY = 'allTierLists'

  // Initialize the database
  async function initDB() {
    return await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      },
    })
  }

  // Save data to IndexedDB
  async function saveData(data: TierList[]) {
    const db = await initDB()

    try {
      // Convert reactive data to plain object using JSON parse/stringify
      const plainData = JSON.parse(JSON.stringify(data))
      await db.put(STORE_NAME, plainData, KEY)
      console.log('Data saved to IndexedDB successfully:', plainData)
    } catch (err) {
      console.error('Error saving data to IndexedDB:', err)
      throw err
    } finally {
      db.close()
    }
  }

  // Load data from IndexedDB
  async function loadData(): Promise<TierList[] | null> {
    const db = await initDB()

    try {
      const savedData = await db.get(STORE_NAME, KEY)
      if (savedData) {
        console.log('Data loaded from IndexedDB successfully:', savedData)
        return savedData
      } else {
        console.log('No saved data found in IndexedDB')
        return null
      }
    } catch (err) {
      console.error('Error loading data from IndexedDB:', err)
      throw err
    } finally {
      db.close()
    }
  }

  return {
    saveData,
    loadData,
  }
}
