'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/context/CartContext';
import { PackagePlus } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';

const productSchema = z.object({
  name: z.string().min(3, 'O nome do produto é obrigatório.'),
  description: z.string().min(10, 'A descrição é obrigatória.'),
  price: z.coerce.number().positive('O preço deve ser um número positivo.'),
  category: z.string().min(2, 'A categoria é obrigatória.'),
  stock: z.coerce.number().int().min(0, 'O estoque não pode ser negativo.'),
  imageUrl: z.string().min(1, 'A imagem do produto é obrigatória.'),
});

type ProductFormValues = z.infer<typeof productSchema>;

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
};

export default function ProductForm() {
  const { addProduct } = useCart();
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      category: '',
      stock: 0,
      imageUrl: '',
    },
  });

  const price = form.watch('price');
  const installmentValue = price > 0 ? price / 10 : 0;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setImagePreview(dataUri);
        form.setValue('imageUrl', dataUri);
      };
      reader.readAsDataURL(file);
    }
  };

  function onSubmit(values: ProductFormValues) {
    addProduct(values);
    form.reset();
    setImagePreview(null);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-8">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Produto</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Smartphone Pro Z" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descreva os detalhes do produto..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Preço (R$)</FormLabel>
                            <FormControl>
                            <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            {price > 0 && (
                            <p className="text-sm text-muted-foreground mt-2">
                                10x de {formatCurrency(installmentValue)} sem juros
                            </p>
                            )}
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Categoria</FormLabel>
                            <FormControl>
                            <Input placeholder="Ex: Eletrônicos" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="stock"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Estoque</FormLabel>
                            <FormControl>
                            <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
            </div>

            <div className="space-y-4">
                 <FormField
                  control={form.control}
                  name="imageUrl"
                  render={() => (
                    <FormItem>
                      <FormLabel>Imagem do Produto</FormLabel>
                      <FormControl>
                        <Input type="file" accept="image/*" onChange={handleImageChange} className="file:text-primary file:font-semibold cursor-pointer"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="aspect-square w-full rounded-md border-2 border-dashed flex items-center justify-center text-muted-foreground bg-muted/20">
                    {imagePreview ? (
                        <div className="relative w-full h-full">
                            <Image
                                src={imagePreview}
                                alt="Pré-visualização do produto"
                                fill
                                className="object-contain rounded-md p-2"
                            />
                        </div>
                    ) : (
                        <p>Pré-visualização da imagem</p>
                    )}
                </div>
            </div>
        </div>

        <Button type="submit" size="lg" className="w-full">
          <PackagePlus className="mr-2 h-5 w-5" />
          Cadastrar Produto
        </Button>
      </form>
    </Form>
  );
}
