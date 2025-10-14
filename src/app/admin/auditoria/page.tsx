'use client';

import { useState } from 'react';
import { useAudit } from '@/context/AuditContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History, User, Calendar, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AuditoriaPage() {
    const { auditLogs, isLoading } = useAudit();
    const [page, setPage] = useState(1);
    const logsPerPage = 20;

    const paginatedLogs = auditLogs.slice((page - 1) * logsPerPage, page * logsPerPage);
    const totalPages = Math.ceil(auditLogs.length / logsPerPage);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="h-6 w-6" />
                    Log de Auditoria
                </CardTitle>
                <CardDescription>
                    Acompanhe as ações importantes realizadas no sistema.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <p>Carregando logs...</p>
                ) : auditLogs.length > 0 ? (
                    <>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[180px]">Data e Hora</TableHead>
                                        <TableHead>Usuário</TableHead>
                                        <TableHead>Ação</TableHead>
                                        <TableHead>Detalhes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-xs">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(log.timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium flex items-center gap-1"><User className="h-3 w-3" /> {log.userName}</span>
                                                    <Badge variant="secondary" className="capitalize w-fit mt-1">
                                                        <Shield className="h-3 w-3 mr-1" />
                                                        {log.userRole}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{log.action}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{log.details}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {totalPages > 1 && (
                            <div className="flex justify-end items-center gap-2 mt-4">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-50">
                                    Anterior
                                </button>
                                <span className="text-sm">
                                    Página {page} de {totalPages}
                                </span>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded text-sm disabled:opacity-50">
                                    Próxima
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                        <History className="mx-auto h-12 w-12" />
                        <h3 className="mt-4 text-lg font-semibold">Nenhum registro de auditoria</h3>
                        <p className="mt-1 text-sm">As ações realizadas no sistema aparecerão aqui.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
