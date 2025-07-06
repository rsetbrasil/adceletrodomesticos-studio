'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useSettings } from '@/context/SettingsContext';
import { useEffect } from 'react';
import { Settings, Save } from 'lucide-react';
import type { StoreSettings } from '@/context/SettingsContext';

const settingsSchema = z.object({
  storeName: z.string().min(3, 'O nome da loja é obrigatório.'),
  storeCity: z.string().min(3, 'A cidade da loja é obrigatória.'),
  pixKey: z.string().min(5, 'A chave PIX é obrigatória.'),
});

export default function ConfiguracaoPage() {
  const { settings, updateSettings, isLoading } = useSettings();

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  useEffect(() => {
    if (!isLoading) {
      form.reset(settings);
    }
  }, [isLoading, settings, form]);

  function onSubmit(values: z.infer<typeof settingsSchema>) {
    updateSettings(values);
  }

  if (isLoading) {
    return <p>Carregando configurações...</p>;
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Configurações da Loja
        </CardTitle>
        <CardDescription>
          Altere as informações da sua loja, como nome e chave PIX para pagamentos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="storeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Loja</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Minha Loja Incrível" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="storeCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade da Loja</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: São Paulo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="pixKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chave PIX</FormLabel>
                      <FormControl>
                        <Input placeholder="CPF, CNPJ, Email, Telefone ou Chave Aleatória" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
