

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAdmin } from '@/context/AdminContext';
import type { Order, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartTooltip } from '@/components/ui/chart';
import { DollarSign, CheckCircle, Clock, Percent, Award, FileText, TrendingUp, Eye, Printer, TrendingDown, ShoppingCart } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Logo from '@/components/Logo';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useAudit } from '@/context/AuditContext';


const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

type SellerCommissionDetails = {
    id: string;
    name: string;
    total: number;
    count: number;
    orderIds: string[];
};

export default function FinanceiroPage() {
  const { payCommissions } = useAdmin();
  const { orders, financialSummary, commissionSummary } = useData();
  const { settings } = useSettings();
  const { user, users } = useAuth();
  const { logAction } = useAudit();
  const router = useRouter();
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<SellerCommissionDetails | null>(null);
  const [printTitle, setPrintTitle] = useState('');
  
  const deliveredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(o => o.status === 'Entregue').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders]);


  const handlePayCommission = async (seller: SellerCommissionDetails) => {
      const period = format(new Date(), 'MMMM/yyyy', { locale: ptBR });
      const paymentId = await payCommissions(seller.id, seller.name, seller.total, seller.orderIds, period, logAction, user);
      if (paymentId) {
          router.push(`/admin/comprovante-comissao/${paymentId}`);
      }
  };
  
  const handleOpenDetails = (seller: SellerCommissionDetails) => {
    setSelectedSeller(seller);
    setIsDetailModalOpen(true);
  };
  
  const ordersForSelectedSeller = useMemo(() => {
    if (!selectedSeller) return [];
    return orders.filter(o => selectedSeller.orderIds.includes(o.id));
  }, [selectedSeller, orders]);

  const handlePrint = (type: 'sales' | 'profits' | 'commissions') => {
    let title = 'Relatório Financeiro';
    
    document.body.classList.remove('print-sales-only', 'print-profits-only', 'print-commissions-only');

    if (type === 'sales') {
        title = 'Relatório de Vendas';
        document.body.classList.add('print-sales-only');
    } else if (type === 'profits') {
        title = 'Relatório de Lucros';
        document.body.classList.add('print-profits-only');
    } else if (type === 'commissions') {
        title = 'Relatório de Comissões';
        document.body.classList.add('print-commissions-only');
    }
    
    setPrintTitle(title);

    setTimeout(() => {
        window.print();
        document.body.classList.remove('print-sales-only', 'print-profits-only', 'print-commissions-only');
    }, 100);
};

  
  const chartConfig = {
      total: {
        label: 'Vendas',
        color: 'hsl(var(--primary))',
      },
    };

  return (
    <div className='space-y-8'>
      <div className="print-hidden">
          <Card>
            <CardHeader>
                <CardTitle>Relatório Financeiro</CardTitle>
                <CardDescription>Resumo de vendas, lucros e comissões. Use os botões para imprimir seções específicas.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
                <Button onClick={() => handlePrint('sales')}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir Vendas
                </Button>
                <Button onClick={() => handlePrint('profits')}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir Lucros
                </Button>
                <Button onClick={() => handlePrint('commissions')}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir Comissões
                </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Vendido</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(financialSummary.totalVendido)}</div>
                <p className="text-xs text-muted-foreground">Soma de todos os pedidos</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lucro Bruto</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(financialSummary.lucroBruto)}</div>
                <p className="text-xs text-muted-foreground">Receita total - Custo dos produtos</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contas a Receber</CardTitle>
                <Clock className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(financialSummary.totalPendente)}</div>
                <p className="text-xs text-muted-foreground">Soma de todas as parcelas pendentes</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Comissões a Pagar</CardTitle>
                <Percent className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(commissionSummary.totalPendingCommission)}</div>
                <p className="text-xs text-muted-foreground">Soma das comissões pendentes</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Vendas Mensais</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <ResponsiveContainer>
                      <BarChart data={financialSummary.monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          tickMargin={10}
                          axisLine={false}
                          className="capitalize"
                        />
                        <YAxis
                          tickFormatter={(value) => formatCurrency(value as number)}
                          tickLine={false}
                          axisLine={false}
                          width={100}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent
                              formatter={(value) => formatCurrency(value as number)}
                              />}
                          />
                        <Legend />
                        <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                  <div>
                    <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" /> Comissões a Pagar</CardTitle>
                    <CardDescription>Total de comissões pendentes para cada vendedor (apenas de pedidos entregues).</CardDescription>
                  </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendedor</TableHead>
                        <TableHead className="text-center">Nº de Vendas</TableHead>
                        <TableHead className="text-right">Comissão Total</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissionSummary.commissionsBySeller.length > 0 ? (
                        commissionSummary.commissionsBySeller.map(seller => (
                          <TableRow key={seller.id}>
                            <TableCell className="font-medium">{seller.name}</TableCell>
                            <TableCell className="text-center">{seller.count}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(seller.total)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDetails(seller)}>
                                        <Eye className="h-4 w-4" />
                                        <span className="sr-only">Ver detalhes</span>
                                    </Button>
                                    <Button size="sm" onClick={() => handlePayCommission(seller)}>
                                        <DollarSign className="mr-2 h-4 w-4" />
                                        Pagar
                                    </Button>
                                </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                              Nenhuma comissão pendente de pagamento.
                            </TableCell>
                          </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
      </div>

       {/* Print-only view */}
      <div className="print-only">
        <div className="mb-8">
            <div className="flex justify-between items-start pb-4 border-b">
                <div>
                    <div className="text-xs">
                        <p className="font-bold">{settings.storeName}</p>
                        <p className="whitespace-pre-line">{settings.storeAddress}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500">{new Date().toLocaleDateString('pt-BR')}</p>
                    <p className="text-lg font-bold">{printTitle}</p>
                </div>
            </div>
        </div>
        
        <div className="print-section-profits print-section-sales space-y-6">
            <h2 className="text-xl font-semibold text-center">Resumo Financeiro</h2>
            <table className="w-full text-base border-collapse">
                 <tbody>
                    <tr className="border-b">
                        <td className="p-2 font-medium">Total Vendido</td>
                        <td className="p-2 text-right font-bold">{formatCurrency(financialSummary.totalVendido)}</td>
                    </tr>
                     <tr className="border-b">
                        <td className="p-2 font-medium">Lucro Bruto</td>
                        <td className="p-2 text-right font-bold">{formatCurrency(financialSummary.lucroBruto)}</td>
                    </tr>
                    <tr className="border-b">
                        <td className="p-2 font-medium">Contas a Receber</td>
                        <td className="p-2 text-right font-bold">{formatCurrency(financialSummary.totalPendente)}</td>
                    </tr>
                    <tr className="border-b">
                        <td className="p-2 font-medium">Comissões a Pagar</td>
                        <td className="p-2 text-right font-bold">{formatCurrency(commissionSummary.totalPendingCommission)}</td>
                    </tr>
                 </tbody>
            </table>
        </div>

        <div className="print-section-sales mt-8">
            <h2 className="text-xl font-semibold text-center mb-4">Vendas Mensais</h2>
            {/* The chart won't be printed as it's complex to render in print. A table is better */}
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="border-b-2">
                        <th className="text-left p-2 font-bold">Mês/Ano</th>
                        <th className="text-left p-2 font-bold">Total Vendido</th>
                    </tr>
                </thead>
                <tbody>
                    {financialSummary.monthlyData.map(item => (
                        <tr key={item.name} className="border-b last:border-none">
                            <td className="p-2 capitalize">{item.name}</td>
                            <td className="p-2 text-right font-semibold">{formatCurrency(item.total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mt-8">
                <h2 className="text-xl font-semibold text-center mb-4">Relatório de Vendas Entregues</h2>
                {deliveredOrders.length > 0 ? (
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="border-b-2">
                                <th className="text-left p-2 font-bold">Data</th>
                                <th className="text-left p-2 font-bold">Pedido</th>
                                <th className="text-left p-2 font-bold">Cliente</th>
                                <th className="text-left p-2 font-bold">Vendedor</th>
                                <th className="text-left p-2 font-bold">Valor</th>
                                <th className="text-left p-2 font-bold">Comissão</th>
                            </tr>
                        </thead>
                        <tbody>
                            {deliveredOrders.map(order => (
                                <tr key={order.id} className="border-b last:border-none">
                                    <td className="p-2">{format(parseISO(order.date), 'dd/MM/yy')}</td>
                                    <td className="p-2 font-mono">{order.id}</td>
                                    <td className="p-2">{order.customer.name}</td>
                                    <td className="p-2">{order.sellerName}</td>
                                    <td className="p-2 text-right">{formatCurrency(order.total)}</td>
                                    <td className="p-2 text-right font-semibold">{formatCurrency(order.commission || 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center text-gray-500 py-8">
                        <ShoppingCart className="mx-auto h-8 w-8" />
                        <p className="mt-2">Nenhuma venda entregue no período.</p>
                    </div>
                )}
            </div>

        </div>

        <div className="print-section-commissions mt-8">
            <h2 className="text-xl font-semibold text-center mb-4">Comissões a Pagar</h2>
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="border-b-2">
                        <th className="text-left p-2 font-bold">Vendedor</th>
                        <th className="text-left p-2 font-bold">Nº de Vendas</th>
                        <th className="text-left p-2 font-bold">Comissão Total</th>
                    </tr>
                </thead>
                <tbody>
                    {commissionSummary.commissionsBySeller.length > 0 ? (
                        commissionSummary.commissionsBySeller.map(seller => (
                        <tr key={seller.id} className="border-b last:border-none">
                            <td className="p-2">{seller.name}</td>
                            <td className="text-center p-2">{seller.count}</td>
                            <td className="text-right p-2 font-semibold">{formatCurrency(seller.total)}</td>
                        </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={3} className="h-24 text-center text-gray-500">
                            Nenhuma comissão pendente de pagamento.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    
    <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Vendas Pendentes de Comissão</DialogTitle>
                <DialogDescription>
                    Lista de vendas para o vendedor <span className="font-bold">{selectedSeller?.name}</span> que compõem o total da comissão.
                </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border max-h-[60vh] overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Pedido</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="text-right">Valor Pedido</TableHead>
                            <TableHead className="text-right">Valor Comissão</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ordersForSelectedSeller.length > 0 ? (
                            ordersForSelectedSeller.map(order => (
                                <TableRow key={order.id}>
                                    <TableCell>{format(parseISO(order.date), "dd/MM/yy")}</TableCell>
                                    <TableCell className="font-mono">{order.id}</TableCell>
                                    <TableCell>{order.customer.name}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency(order.commission || 0)}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">Nenhum pedido encontrado.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </DialogContent>
    </Dialog>
    </div>
  );
}
