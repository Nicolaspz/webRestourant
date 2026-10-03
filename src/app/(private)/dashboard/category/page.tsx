"use client";

import { CategoryTable } from "@/components/dashboard/category/CategoryTable";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export default function CategoryPage() {
    return (
        <div className="space-y-6">
            <DashboardPageHeader title="Categorias" description="Organize os produtos para facilitar a navegação e a gestão do menu." />

            <CategoryTable />
        </div>
    );
}
