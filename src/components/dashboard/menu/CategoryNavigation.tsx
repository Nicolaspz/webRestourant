// components/dashboard/menu/CategoryNavigation.tsx
'use client';

interface CategoryNavigationProps {
  categories: string[];
  activeCategory: string | null;
  onCategoryChange: (category: string) => void;
}

const CategoryNavigation = ({
  categories,
  activeCategory,
  onCategoryChange
}: CategoryNavigationProps) => {
  const customColors = {
    primary: '#2563eb',
    borderLight: '#cbd5e1',
    textSecondary: '#475569'
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 py-3">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === category 
                ? 'text-white shadow-md' 
                : 'border hover:shadow-sm'
            }`}
            style={{
              backgroundColor: activeCategory === category ? customColors.primary : 'white',
              borderColor: activeCategory === category ? customColors.primary : customColors.borderLight,
              color: activeCategory === category ? 'white' : customColors.textSecondary
            }}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryNavigation;