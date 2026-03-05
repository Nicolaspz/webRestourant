'use client';

import { SupplierSection } from "@/components/settings/SupplierSection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function FornecedoresPage() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gestão de Fornecedores</CardTitle>
                    <CardDescription>
                        Gerencie os fornecedores e parceiros do seu restaurante
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SupplierSection />
                </CardContent>
            </Card>
        </div>
    );
}
