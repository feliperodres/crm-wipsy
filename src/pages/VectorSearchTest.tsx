import React from 'react';
import VectorSearchDemo from '@/components/VectorSearchDemo';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const VectorSearchTest = () => {
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">
              Prueba de Búsqueda Vectorial
            </h1>
            <p className="text-muted-foreground mt-2">
              Prueba las capacidades de búsqueda semántica por texto e imágenes con CLIP
            </p>
          </div>
          
          <VectorSearchDemo />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VectorSearchTest;