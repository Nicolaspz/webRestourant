"use client";

import { CategoryTable } from "@/components/dashboard/category/CategoryTable";

export default function CategoryPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Gestão de Categorias
                </h1>
                <p className="text-gray-400 mt-1">
                    Organize os seus produtos em categorias para facilitar a navegação e gestão do menu.
                </p>
            </div>

            <CategoryTable />
        </div>
    );
}
