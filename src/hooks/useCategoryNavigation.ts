'use client';

import { useCallback, useEffect } from 'react';

const categoryId = (category: string) => category.replace(/\s+/g, '-');

export function useCategoryNavigation(categories: string[], setActiveCategory: (category: string) => void) {
  const scrollToCategory = useCallback((category: string) => {
    setActiveCategory(category);
    document.getElementById(categoryId(category))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [setActiveCategory]);

  useEffect(() => {
    if (categories.length === 0) return;
    const categoryById = new Map(categories.map(category => [categoryId(category), category]));
    const observer = new IntersectionObserver(entries => {
      const visible = entries.find(entry => entry.isIntersecting);
      const category = visible && categoryById.get(visible.target.id);
      if (category) setActiveCategory(category);
    }, { threshold: 0.3, rootMargin: '-80px 0px -50% 0px' });

    categories.forEach(category => {
      const element = document.getElementById(categoryId(category));
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [categories, setActiveCategory]);

  return scrollToCategory;
}
