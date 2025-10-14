'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartTooltip } from '@/components/ui/chart';
import { DollarSign, CheckCircle, Clock, Percent, User, Award } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function FinanceiroPage() {
  const { orders } = useCart();
  const { users } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const financialSummary = useMemo(() => {
    if (!isClient || !orders) {
      return { totalVendido: 0, totalRecebido: 0, totalPendente: 0, monthlyData: [] };
    }

    let totalVendido = 0;
    let totalRecebido = 0;
    let totalPendente = 0;
    const monthlySales: { [key: string]: number } = {};

    orders.forEach(order => {
      if (order.status !== 'Cancelado') {
        totalVendido += order.total;

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

    return { totalVendido, totalRecebido, totalPendente, monthlyData };
  }, [orders, isClient]);

  const commissionSummary = useMemo(() => {
    if (!isClient || !orders || !users) {
        return { totalCommission: 0, commissionsBySeller: [] };
    }

    const sellerCommissions = new Map<string, { name: string; total: number; count: number }>();

    orders.forEach(order => {
        if (order.commission && order.commission > 0) {
            const sellerId = order.sellerId;
            const current = sellerCommissions.get(sellerId) || { name: order.sellerName, total: 0, count: 0 };
            current.total += order.commission;
            current.count += 1;
            sellerCommissions.set(sellerId, current);
        }
    });

    const commissionsBySeller = Array.from(sellerCommissions.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a,b) => b.total - a.total);

    const totalCommission = commissionsBySeller.reduce((acc, seller) => acc + seller.total, 0);

    return { totalCommission, commissionsBySeller };
  }, [orders, users, isClient]);


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
            <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(financialSummary.totalRecebido)}</div>
            <p className="text-xs text-muted-foreground">Soma de parcelas pagas e pagamentos à vista</p>
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
            <CardTitle className="text-sm font-medium">Total de Comissões</CardTitle>
            <Percent className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(commissionSummary.totalCommission)}</div>
            <p className="text-xs text-muted-foreground">Soma de todas as comissões a pagar</p>
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
              <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" /> Resumo de Comissões por Vendedor</CardTitle>
              <CardDescription>Total de comissões calculadas para cada vendedor.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-center">Nº de Vendas</TableHead>
                    <TableHead className="text-right">Comissão Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissionSummary.commissionsBySeller.map(seller => (
                    <TableRow key={seller.id}>
                      <TableCell className="font-medium">{seller.name}</TableCell>
                      <TableCell className="text-center">{seller.count}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(seller.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
