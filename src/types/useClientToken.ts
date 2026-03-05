import { useEffect, useState } from 'react'
import { generateClientToken } from '@/utils/clientToken'
import { getCookie, setCookie } from '@/utils/cookies'

export const useClientToken = (tableNumber?: string) => {
  const [clientToken, setClientToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false)
      return
    }

    // Se não houver tableNumber (ex: rota /ID_ORG aberta), usamos um token genérico
    const effectiveTableNumber = tableNumber || 'GENERIC'

    const cookieName =
      effectiveTableNumber === 'TAKEAWAY' || effectiveTableNumber === 'GENERIC'
        ? '@servFixe.clientToken_generic'
        : `@servFixe.clientToken_mesa_${effectiveTableNumber}`

    let token = getCookie(cookieName)

    // 🔥 SE NÃO EXISTIR → CRIA
    if (!token) {
      token = generateClientToken(effectiveTableNumber === 'GENERIC' ? 'TAKEAWAY' : effectiveTableNumber)
      setCookie(cookieName, token, 60 * 60 * 24)
      console.log('🆕 Token criado (Root/Public):', token)
    }

    setClientToken(token)
    setIsLoading(false)
  }, [tableNumber])

  return { clientToken, isLoading }
}
