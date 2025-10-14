

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import type { Product, Order } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartTooltip } from '@/components/ui/chart';
import { DollarSign, CheckCircle, Clock, Percent, Award, FileText, TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from 'next/navigation';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function FinanceiroPage() {
  const { orders, products, payCommissions } = useCart();
  const { users } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const financialSummary = useMemo(() => {
    if (!isClient || !orders || !products) {
      return { totalVendido: 0, totalRecebido: 0, totalPendente: 0, lucroBruto: 0, monthlyData: [] };
    }

    let totalVendido = 0;
    let totalRecebido = 0;
    let totalPendente = 0;
    let lucroBruto = 0;
    const monthlySales: { [key: string]: number } = {};

    orders.forEach(order => {
      if (order.status !== 'Cancelado' && order.status !== 'Excluído') {
        totalVendido += order.total;

        order.items.forEach(item => {
            const product = products.find(p => p.id === item.id);
            const cost = product?.cost || 0;
            const itemRevenue = item.price * item.quantity;
            const itemCost = cost * item.quantity;
            lucroBruto += (itemRevenue - itemCost);
        });

        const monthKey = format(parseISO(order.date), 'MMM/yy', { locale: ptBR });
        if (!monthlySales[monthKey]) {
          monthlySales[monthKey] = 0;
        }
        monthlySales[monthKey] += order.total;

        if (order.paymentMethod === 'Crediário') {
            (order.installmentDetails || []).forEach(inst => {
            if (inst.status === 'Pago') {
                totalRecebido += inst.amount;
            } else {
                totalPendente += inst.amount;
            }
            });
        } else {
            // Consider PIX/Dinheiro as fully paid
            totalRecebido += order.total;
        }
      }
    });
    
    const monthlyData = Object.entries(monthlySales).map(([name, total]) => ({ name, total })).reverse();

    return { totalVendido, totalRecebido, totalPendente, lucroBruto, monthlyData };
  }, [orders, products, isClient]);

  const commissionSummary = useMemo(() => {
    if (!isClient || !orders || !users) {
        return { totalPendingCommission: 0, commissionsBySeller: [] };
    }

    const sellerCommissions = new Map<string, { name: string; total: number; count: number; orderIds: string[] }>();

    orders.forEach(order => {
        // Only include commissions from delivered and unpaid orders
        if (order.status === 'Entregue' && order.sellerId && typeof order.commission === 'number' && order.commission > 0 && !order.commissionPaid) {
            const sellerId = order.sellerId;
            const sellerName = order.sellerName || users.find(u => u.id === sellerId)?.name || 'Vendedor Desconhecido';
            
            const current = sellerCommissions.get(sellerId) || { name: sellerName, total: 0, count: 0, orderIds: [] };
            current.total += order.commission;
            current.count += 1;
            current.orderIds.push(order.id);
            sellerCommissions.set(sellerId, current);
        }
    });

    const commissionsBySeller = Array.from(sellerCommissions.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a,b) => b.total - a.total);

    const totalPendingCommission = commissionsBySeller.reduce((acc, seller) => acc + seller.total, 0);

    return { totalPendingCommission, commissionsBySeller };
  }, [orders, users, isClient]);

  const handlePayCommission = async (sellerId: string, sellerName: string, amount: number, orderIds: string[]) => {
      const period = format(new Date(), 'MMMM/yyyy', { locale: ptBR });
      const paymentId = await payCommissions(sellerId, sellerName, amount, orderIds, period);
      if (paymentId) {
          router.push(`/admin/commission-receipt/${paymentId}`);
      }
  };


  if (!isClient) {
    return (
        <div className="flex justify-center items-center py-24">
            <p>Carregando painel financeiro...</p>
        </div>
    );
  }
  
  const chartConfig = {
      total: {
        label: 'Vendas',
        color: 'hsl(var(--primary))',
      },
    };

  return (
    <div className="space-y-8">
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
              <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" /> Comissões a Pagar</CardTitle>
              <CardDescription>Total de comissões pendentes para cada vendedor (apenas de pedidos entregues).</CardDescription>
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
                            <Button size="sm" onClick={() => handlePayCommission(seller.id, seller.name, seller.total, seller.orderIds)}>
                                <DollarSign className="mr-2 h-4 w-4" />
                                Pagar Comissão
                            </Button>
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
  );
}
