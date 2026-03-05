// components/settings/OrganizationSection.tsx
"use client"
import { useState, useRef, ChangeEvent, FormEvent, useContext, useEffect } from 'react'
import { toast } from 'react-toastify'
import { AuthContext } from '@/contexts/AuthContext'
import { setupAPIClient } from "@/services/api"
import { API_BASE_URL } from '../../../config'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Upload, Building2, Image as ImageIcon } from "lucide-react"
import { Organization } from '@/types/product'

interface OrganizationSectionProps {
  organization: Organization
  onUpdateSuccess?: (updatedOrg: Organization) => void
}

export function OrganizationSection({ organization, onUpdateSuccess }: OrganizationSectionProps) {
  const [formData, setFormData] = useState<Organization>(organization)
  const [preview, setPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const apiClient = setupAPIClient()
  const { user } = useContext(AuthContext)

  // Log para debug
  console.log('🎯 OrganizationSection:', {
    organization,
    imageLogo: organization?.imageLogo,
    API_BASE_URL
  })

  // Atualiza quando a prop organization muda
  useEffect(() => {
    console.log('🔄 Atualizando formData com:', organization)
    setFormData(organization)
    
    // Reseta o estado da imagem
    setImageError(false)
    setIsImageLoading(!!organization?.imageLogo) // Só loading se tiver imagem
    
    // Se tem imagem, constrói a URL no mesmo formato dos produtos
    if (organization?.imageLogo) {
      const imageUrl = `${API_BASE_URL}/tmp/${organization.imageLogo}`
      console.log('🖼️ URL da imagem:', imageUrl)
      setPreview(imageUrl)
      setIsImageLoading(false)
    } else {
      console.log('ℹ️ Sem imagem para carregar')
      setPreview(null)
      setIsImageLoading(false)
    }
  }, [organization])

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    console.log(`✏️ Campo ${name} alterado para:`, value)
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0]
      console.log('📸 Arquivo selecionado:', file.name, file.type, file.size)

      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione um arquivo de imagem válido')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB')
        return
      }

      setIsImageLoading(true)
      setImageError(false)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        console.log('✅ Preview gerado do novo arquivo')
        setPreview(reader.result as string)
        setIsImageLoading(false)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    console.log('📤 Enviando formulário com dados:', formData)
    setIsLoading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name || '')
      formDataToSend.append('address', formData.address || '')
      formDataToSend.append('nif', formData.nif || '')

      if (fileInputRef.current?.files?.[0]) {
        console.log('📎 Anexando arquivo:', fileInputRef.current.files[0].name)
        formDataToSend.append('imageLogo', fileInputRef.current.files[0])
      }

      const response = await apiClient.put(
        `/organization/${organization.id}`,
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        }
      )

      console.log('✅ Resposta do update:', response.data)
      
      // A API pode retornar { success: true, organization: { ... } } ou diretamente os dados
      const updatedData = response.data.organization || response.data
      
      toast.success('Organização atualizada com sucesso!')
      onUpdateSuccess?.(updatedData)
      setIsEditing(false)
    } catch (error: any) {
      console.error('❌ Erro ao atualizar:', error)
      const errorMessage = error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Erro ao atualizar organização'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    console.log('❌ Cancelando edição')
    setFormData(organization)
    setImageError(false)
    setIsImageLoading(false)
    
    // Restaura o preview original
    if (organization?.imageLogo) {
      setPreview(`${API_BASE_URL}/tmp/${organization.imageLogo}`)
    } else {
      setPreview(null)
    }
    
    setIsEditing(false)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Garantir que formData tem valores padrão
  const safeFormData = {
    name: formData?.name || '',
    nif: formData?.nif || '',
    address: formData?.address || '',
    imageLogo: formData?.imageLogo || null
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Informações da Organização</h2>
        <p className="text-sm text-gray-600">Gerencie os dados da sua empresa</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Upload de Logo */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Avatar className="w-24 h-24 border-2 border-gray-200">
              {isImageLoading ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : preview ? (
                <img
                  src={preview}
                  alt="Logo da organização"
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    console.error('❌ Erro ao carregar imagem:', (e.target as HTMLImageElement).src)
                    setImageError(true)
                    setPreview(null)
                  }}
                />
              ) : (
                <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                  <Building2 className="w-8 h-8" />
                </AvatarFallback>
              )}
            </Avatar>

            {isEditing && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImageLoading}
              >
                <Upload className="w-4 h-4" />
              </Button>
            )}
          </div>

          {isEditing && (
            <div className="text-center">
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <input
                  id="logo-upload"
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isImageLoading}
                />
                <span className="text-sm text-blue-600 hover:text-blue-700">
                  {isImageLoading ? 'Carregando...' : 'Alterar logo'}
                </span>
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG até 5MB
              </p>
              {imageError && !isEditing && (
                <p className="text-xs text-red-500 mt-1">
                  Erro ao carregar imagem. Tente fazer upload novamente.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Campos do formulário */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Organização</Label>
            <Input
              id="name"
              name="name"
              value={safeFormData.name}
              onChange={handleInputChange}
              disabled={!isEditing || isLoading}
              placeholder="Nome da sua empresa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nif">NIF</Label>
            <Input
              id="nif"
              name="nif"
              value={safeFormData.nif}
              onChange={handleInputChange}
              disabled={!isEditing || isLoading}
              placeholder="Número de identificação fiscal"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              name="address"
              value={safeFormData.address}
              onChange={handleInputChange}
              disabled={!isEditing || isLoading}
              placeholder="Endereço completo"
            />
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex justify-end space-x-3 pt-4">
          {!isEditing ? (
            <Button
              type="button"
              onClick={() => {
                console.log('✏️ Iniciando edição')
                setIsEditing(true)
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Editar Informações
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || isImageLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </>
          )}
        </div>
      </form>
    </Card>
  )
}