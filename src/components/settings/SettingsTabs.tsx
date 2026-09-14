// components/settings/SettingsTabs.tsx (atualizado)
"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Lock, Bell, CreditCard, Building2, Loader2, Truck, Printer, Warehouse, ArrowRightLeft, ClipboardList } from "lucide-react"
import { useState } from "react"

interface Tab {
  id: string
  label: string
  icon: string
  content: React.ReactNode
}

interface SettingsTabsProps {
  tabs: Tab[]
  defaultTab: string
}

const iconMap = {
  warehouse: <Warehouse className="h-4 w-4" />,
  "arrow-right-left": <ArrowRightLeft className="h-4 w-4" />,
  "clipboard-list": <ClipboardList className="h-4 w-4" />,
  user: <User className="mr-2 h-4 w-4" />,
  lock: <Lock className="mr-2 h-4 w-4" />,
  bell: <Bell className="mr-2 h-4 w-4" />,
  "credit-card": <CreditCard className="mr-2 h-4 w-4" />,
  building: <Building2 className="mr-2 h-4 w-4" />,
  truck: <Truck className="mr-2 h-4 w-4" />,
  printer: <Printer className="mr-2 h-4 w-4" />,
}

export function SettingsTabs({ tabs, defaultTab }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)

  return (
    <Tabs
      value={activeTab}
      onValueChange={(val) => setActiveTab(val)}
      className="w-full"
    >
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 p-1">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="cursor-pointer">
            {iconMap[tab.icon as keyof typeof iconMap]}
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="mt-6">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
