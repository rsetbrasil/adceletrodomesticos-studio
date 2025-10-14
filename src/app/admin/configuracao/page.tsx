
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useSettings } from '@/context/SettingsContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { Settings, Save, FileDown, Upload, AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';
import type { StoreSettings } from '@/context/SettingsContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAudit } from '@/context/AuditContext';

const settingsSchema = z.object({
  storeName: z.string().min(3, 'O nome da loja é obrigatório.'),
  storeCity: z.string().min(3, 'A cidade da loja é obrigatória.'),
  pixKey: z.string().min(1, 'A chave PIX é obrigatória.'),
});

export default function ConfiguracaoPage() {
  const { settings, updateSettings, isLoading: settingsLoading, restoreSettings, resetSettings } = useSettings();
  const { products, orders, categories, restoreCartData, resetOrders, resetAllCartData } = useCart();
  const { users, restoreUsers, initialUsers } = useAuth();
  const { toast } = useToast();
  const { logAction } = useAudit();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [dialogOpenFor, setDialogOpenFor] = useState<'resetOrders' | 'resetAll' | null>(null);

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  useEffect(() => {
    if (!settingsLoading) {
      form.reset(settings);
    }
  }, [settingsLoading, settings, form]);

  const handleBackup = () => {
    const backupData = {
      settings,
      products,
      orders,
      categories,
      users,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().slice(0, 10);
    link.download = `backup-adc-loja-${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Backup Gerado!', description: 'O arquivo de backup foi baixado.' });
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        // Basic validation to check if it's a valid backup file
        if (data.settings && data.products && data.orders && data.categories && data.users) {
          await restoreSettings(data.settings, logAction);
          await restoreCartData({ products: data.products, orders: data.orders, categories: data.categories });
          await restoreUsers(data.users, logAction);
          toast({ title: 'Backup Restaurado!', description: 'Os dados da loja foram restaurados com sucesso.' });
        } else {
          throw new Error('Formato de arquivo de backup inválido.');
        }
      } catch (error) {
        console.error("Failed to restore backup:", error);
        toast({ title: 'Erro ao Restaurar', description: 'O arquivo de backup é inválido ou está corrompido.', variant: 'destructive' });
      } finally {
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };
  
  const handleResetOrders = async () => {
    await resetOrders();
    setDialogOpenFor(null);
    toast({ title: "Ação Concluída", description: "Todos os pedidos e clientes foram zerados." });
  };

  const handleResetAll = async () => {
    await resetAllCartData();
    await restoreUsers(initialUsers, logAction);
    await resetSettings(logAction);
    setDialogOpenFor(null);
    toast({ title: "Loja Resetada!", description: "Todos os dados foram restaurados para o padrão." });
  }

  function onSubmit(values: z.infer<typeof settingsSchema>) {
    updateSettings(values, logAction);
  }

  if (settingsLoading) {
    return <p>Carregando configurações...</p>;
  }

  return (
    <div className="space-y-8">
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

      <Card className="max-w-2xl">
          <CardHeader>
              <CardTitle>Backup e Restauração</CardTitle>
              <CardDescription>Salve ou recupere todos os dados da sua loja (produtos, pedidos, configurações, etc).</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
              <Button onClick={handleBackup}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Fazer Backup
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                   <Upload className="mr-2 h-4 w-4" />
                  Restaurar Backup
              </Button>
              <Input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleRestore} />
          </CardContent>
      </Card>

       <Card className="max-w-2xl border-destructive/50">
          <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-6 w-6" />
                  Zona de Perigo
              </CardTitle>
              <CardDescription>Ações nesta área são irreversíveis. Tenha certeza do que está fazendo.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
              <AlertDialog open={dialogOpenFor === 'resetOrders'} onOpenChange={(open) => !open && setDialogOpenFor(null)}>
                  <AlertDialogTrigger asChild>
                      <Button variant="destructive" onClick={() => setDialogOpenFor('resetOrders')}>
                        <Trash2 className="mr-2 h-4 w-4" /> Zerar Pedidos e Clientes
                      </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                          <AlertDialogDescription>
                              Esta ação não pode ser desfeita. Isso irá apagar permanentemente todos os pedidos e dados de clientes da sua loja.
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleResetOrders}>Sim, zerar os pedidos</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>

               <AlertDialog open={dialogOpenFor === 'resetAll'} onOpenChange={(open) => !open && setDialogOpenFor(null)}>
                  <AlertDialogTrigger asChild>
                      <Button variant="destructive" outline className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => setDialogOpenFor('resetAll')}>
                          <RotateCcw className="mr-2 h-4 w-4" /> Resetar Loja ao Padrão
                      </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Você realmente quer resetar toda a loja?</AlertDialogTitle>
                          <AlertDialogDescription>
                              Esta ação é irreversível. Todos os produtos, pedidos, clientes e categorias serão apagados. A loja voltará ao estado inicial, como se tivesse acabado de ser instalada.
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                           <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleResetAll}>Sim, resetar toda a loja</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
          </CardContent>
       </Card>
    </div>
  );
}
