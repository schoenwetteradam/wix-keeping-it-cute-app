import { promises as fs } from 'fs'
import path from 'path'

const filePath = path.join(process.cwd(), 'data', 'notifications.json')

export async function loadNotifications() {
  try {
    const data = await fs.readFile(filePath, 'utf8')
    return JSON.parse(data)
  } catch (err) {
    return []
  }
}

export async function saveNotifications(notifications) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(notifications, null, 2))
}

export async function addNotification(notification) {
  const notifications = await loadNotifications()
  notifications.push({ id: Date.now().toString(), ...notification })
  await saveNotifications(notifications)
}
