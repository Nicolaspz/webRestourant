'use client'
import { useEffect, useState, useContext } from 'react'
import { AuthContext } from '@/contexts/AuthContext'
import { SettingsHeader } from "@/components/settings/SettingsHeader"
import { AccountSection } from "@/components/settings/AccountSection"
import { SecuritySection } from "@/components/settings/SecuritySection"
import { OrganizationSection } from "@/components/settings/OrganizationSection"
import { SettingsTabs } from "@/components/settings/SettingsTabs"
import { SupplierSection } from "@/components/settings/SupplierSection"
import AreasPage from '../economato/areas/page'
import Head from 'next/head'
import { setupAPIClient } from "@/services/api"

export default function SettingsPage() {
  const { user } = useContext(AuthContext)
  const [organization, setOrganization] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Função para buscar dados completos da organização
  const fetchOrganizationDetails = async () => {
    try {
      const apiClient = setupAPIClient()
      console.log('🔍 Buscando organização ID:', user?.organizationId)
      const response = await apiClient.get(`/organization/${user?.organizationId}`)
      console.log('✅ Resposta da API organization:', response.data)
      
      // A API retorna { success: true, organization: { ... } }
      return response.data.organization || response.data
    } catch (error) {
      console.error('❌ Erro ao buscar detalhes da organização:', error)
      return null
    }
  }

  useEffect(() => {
    async function loadOrganizationData() {
      if (!user?.organizationId) {
       // console.log('⚠️ Sem organizationId no user')
        setIsLoading(false)
        return
      }

    {/* console.log('📦 User data:', {
        organizationId: user.organizationId,
        name_org: user.name_org,
        address: user.address,
        nif: user.nif,
        imageLogo: user.imageLogo
      }) */}
     

      try {
        // Primeiro, usa os dados do user como fallback
        const orgData: any = {
          id: user.organizationId || '',
          name: user.name_org || '',
          address: user.address || '',
          nif: user.nif || '',
          imageLogo: user.imageLogo || null,
        }
        //console.log('📦 Org data from user:', orgData)

        // Tenta buscar dados mais completos da API
        const detailedOrg = await fetchOrganizationDetails()
        //console.log('📦 Dados detalhados da API:', detailedOrg)

        if (detailedOrg) {
          console.log('✅ Usando dados da API')
          
          // Mapear os campos se necessário
          const mappedOrg = {
            id: detailedOrg.id,
            name: detailedOrg.name,
            address: detailedOrg.address || '',
            nif: detailedOrg.nif || '',
            imageLogo: detailedOrg.imageLogo || null
          }
          
          //console.log('📦 Dados mapeados:', mappedOrg)
          setOrganization(mappedOrg)
        } else {
          //console.log('⚠️ Usando dados do user como fallback')
          setOrganization(orgData)
        }
      } catch (error) {
        //console.error('❌ Erro ao carregar organização:', error)
        // Em caso de erro, usa os dados do user
        setOrganization({
          id: user.organizationId || '',
          name: user.name_org || '',
          address: user.address || '',
          nif: user.nif || '',
          imageLogo: user.imageLogo || null,
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadOrganizationData()
  }, [user])

  const handleUpdateSuccess = (updatedOrg: any) => {
    //console.log('✅ Organização atualizada:', updatedOrg)
    setOrganization(updatedOrg)
  }

  // Skeleton loading component
  const SkeletonLoader = () => (
    <div className="space-y-4">
      <div className="h-8 bg-gray-200 rounded animate-pulse w-1/4"></div>
      <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
  )

  const tabs = [
    {
      id: "organization",
      label: "Organização",
      icon: "building",
      content: organization ? (
        <OrganizationSection
          organization={organization}
          onUpdateSuccess={handleUpdateSuccess}
        />
      ) : (
        <SkeletonLoader />
      )
    },
    {
      id: "account",
      label: "Conta",
      icon: "user",
      content: <AccountSection />
    },
    {
      id: "security",
      label: "Segurança",
      icon: "lock",
      content: <SecuritySection />
    },
    {
      id: "area",
      label: "Área de Trabalho",
      icon: "lock",
      content: <AreasPage />
    },
    {
      id: "suppliers",
      label: "Fornecedores",
      icon: "truck",
      content: <SupplierSection />
    },
  ]

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>ServeFixe - Definições</title>
      </Head>

      <div className="flex-1 space-y-6 p-6">
        <SettingsHeader
          title="Configurações do Sistema"
          description="Gerencie preferências da conta e configurações da organização"
        />

        <SettingsTabs tabs={tabs} defaultTab="organization" />
      </div>
    </>
  )
}