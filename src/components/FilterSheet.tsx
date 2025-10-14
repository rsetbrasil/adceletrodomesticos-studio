
'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from './ui/button';
import { useCart } from '@/context/CartContext';
import { ScrollArea } from './ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import type { Category } from '@/lib/types';
import { Filter } from 'lucide-react';

interface FilterSheetProps {
    children: React.ReactNode;
    categories: Category[];
    onFilterChange: (filters: { category?: string; subcategory?: string; }) => void;
    currentFilters: {
        category: string;
        subcategory: string;
    };
}


export function FilterSheet({ children, categories, onFilterChange, currentFilters }: FilterSheetProps) {
  const { isFilterSheetOpen, setFilterSheetOpen } = useCart();
  
  return (
    <Sheet open={isFilterSheetOpen} onOpenChange={setFilterSheetOpen}>
      <SheetTrigger asChild onClick={() => setFilterSheetOpen(true)}>{children}</SheetTrigger>
      <SheetContent side="left" className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-2xl font-headline flex items-center gap-2">
            <Filter />
            Filtros
          </SheetTitle>
        </SheetHeader>
            <ScrollArea className="flex-grow pr-4 -mr-6 my-4">
              <div className="flex flex-col gap-2">
                <Button
                    variant={currentFilters.category === 'all' ? 'secondary' : 'ghost'}
                    className="justify-start w-full"
                    onClick={() => onFilterChange({ category: 'all' })}
                >
                    Todas as Categorias
                </Button>

                <Accordion type="single" collapsible className="w-full">
                    {categories.map((category) => (
                        <AccordionItem value={category.id} key={category.id}>
                            <AccordionTrigger 
                                className="hover:no-underline capitalize"
                                onClick={(e) => {
                                    if ((e.target as HTMLElement).closest('.subcategory-button')) return;
                                    onFilterChange({ category: category.name })
                                }}
                            >
                                {category.name}
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="flex flex-col items-start pl-4">
                                {category.subcategories && category.subcategories.map(sub => (
                                    <Button
                                        key={sub}
                                        variant={currentFilters.subcategory === sub && currentFilters.category === category.name ? 'secondary' : 'ghost'}
                                        size="sm"
                                        className="w-full justify-start capitalize subcategory-button"
                                        onClick={() => onFilterChange({ category: category.name, subcategory: sub })}
                                    >
                                        {sub}
                                    </Button>
                                ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
              </div>
            </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
