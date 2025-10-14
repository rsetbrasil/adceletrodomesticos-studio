
'use client';

import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';

export default function ProductFilters() {
  return (
    <div className="bg-card p-4 rounded-lg shadow-sm mb-8">
        <Button variant="outline" className="w-full sm:w-auto">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
        </Button>
    </div>
  );
}
