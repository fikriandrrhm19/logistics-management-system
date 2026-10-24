import { ref } from 'vue'

const message = ref('')
const kind = ref<'success' | 'error' | 'info'>('info')
let timeout: ReturnType<typeof setTimeout> | undefined

export function useToast() {
  function show(text: string, tone: 'success' | 'error' | 'info' = 'info') {
    message.value = text
    kind.value = tone
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => { message.value = '' }, 3200)
  }
  return { message, kind, show }
}
