
'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Category } from '@/lib/types';


interface ProductFiltersProps {
  onFilterChange: (filters: {
    category?: string;
    subcategory?: string;
    search?: string;
    sort?: string;
  }) => void;
  categories: Category[];
  currentFilters: {
      category: string;
      subcategory: string;
      search: string;
      sort: string;
  }
}

export default function ProductFilters({ onFilterChange, categories, currentFilters }: ProductFiltersProps) {

  return (
    <div className="bg-card p-4 rounded-lg shadow-sm mb-8">
       <div className="flex flex-wrap gap-2">
        <Button
          variant={currentFilters.category === 'all' ? 'secondary' : 'ghost'}
          onClick={() => onFilterChange({ category: 'all' })}
          className="text-xs px-3"
        >
          Todas
        </Button>
        {categories.map((cat) => {
          if (!cat.subcategories || cat.subcategories.length === 0) {
            return (
              <Button
                key={cat.id}
                variant={currentFilters.category === cat.name ? 'secondary' : 'ghost'}
                onClick={() => onFilterChange({ category: cat.name })}
                className="capitalize text-xs px-3"
              >
                {cat.name}
              </Button>
            )
          }

          return (
             <DropdownMenu key={cat.id}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={currentFilters.category === cat.name ? 'secondary' : 'ghost'}
                  className="capitalize text-xs px-3"
                  onClick={() => onFilterChange({ category: cat.name, subcategory: 'all' })}
                >
                  {cat.name}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => onFilterChange({ category: cat.name, subcategory: 'all' })}>
                  Todas em {cat.name}
                </DropdownMenuItem>
                {cat.subcategories.map((sub, index) => (
                  <DropdownMenuItem key={index} onSelect={() => onFilterChange({ category: cat.name, subcategory: sub })}>
                    {sub}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        })}
      </div>
    </div>
  );
}
