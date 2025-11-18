
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getClientFirebase } from '@/lib/firebase-client';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import type { ChatSession, ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, UserCircle, CheckCircle, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function AtendimentoPage() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [filter, setFilter] = useState<'open' | 'active' | 'closed'>('open');
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const { db } = getClientFirebase();

    useEffect(() => {
        const sessionsRef = collection(db, 'chatSessions');
        const q = query(sessionsRef, orderBy('lastMessageAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedSessions: ChatSession[] = [];
            snapshot.forEach(doc => {
                fetchedSessions.push({ id: doc.id, ...doc.data() } as ChatSession);
            });
            setSessions(fetchedSessions);
        });

        return () => unsubscribe();
    }, [db]);

    useEffect(() => {
        if (!selectedSession) {
            setMessages([]);
            return;
        }

        const messagesRef = collection(db, 'chatSessions', selectedSession.id, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMessages: ChatMessage[] = [];
            snapshot.forEach(doc => {
                fetchedMessages.push({ id: doc.id, ...doc.data() } as ChatMessage);
            });
            setMessages(fetchedMessages);
        });

        return () => unsubscribe();
    }, [selectedSession, db]);
    
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

    const handleSelectSession = async (session: ChatSession) => {
        setSelectedSession(session);
        const sessionRef = doc(db, 'chatSessions', session.id);

        const updates: Partial<ChatSession> = { unreadBySeller: false };
        if (session.status === 'open') {
            updates.status = 'active';
            updates.sellerId = user?.id;
            updates.sellerName = user?.name;
        }
        await updateDoc(sessionRef, updates);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedSession || !user) return;

        const messagesRef = collection(db, 'chatSessions', selectedSession.id, 'messages');
        await addDoc(messagesRef, {
            text: newMessage,
            sender: 'seller',
            senderName: user.name,
            timestamp: new Date().toISOString(),
        });

        const sessionRef = doc(db, 'chatSessions', selectedSession.id);
        await updateDoc(sessionRef, {
            lastMessageAt: new Date().toISOString(),
            lastMessageText: newMessage,
            unreadByVisitor: true,
        });

        setNewMessage('');
    };
    
    const handleCloseSession = async () => {
        if (!selectedSession) return;
        const sessionRef = doc(db, 'chatSessions', selectedSession.id);
        await updateDoc(sessionRef, { status: 'closed' });
        setSelectedSession(null);
    }

    const filteredSessions = useMemo(() => {
        return sessions.filter(s => {
            if (filter === 'active') {
                return s.status === 'active' && s.sellerId === user?.id;
            }
            return s.status === filter;
        });
    }, [sessions, filter, user]);

    return (
        <div className="flex h-[calc(100vh-10rem)] border rounded-lg overflow-hidden">
            <aside className="w-1/3 border-r flex flex-col">
                <div className="p-4 border-b">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <MessageSquare /> Atendimento
                    </h2>
                     <div className="flex gap-2 mt-4">
                        <Button variant={filter === 'open' ? 'default' : 'outline'} onClick={() => setFilter('open')} size="sm">Abertos</Button>
                        <Button variant={filter === 'active' ? 'default' : 'outline'} onClick={() => setFilter('active')} size="sm">Meus Chats</Button>
                        <Button variant={filter === 'closed' ? 'default' : 'outline'} onClick={() => setFilter('closed')} size="sm">Fechados</Button>
                    </div>
                </div>
                <ScrollArea className="flex-grow">
                    {filteredSessions.map(session => (
                        <button
                            key={session.id}
                            onClick={() => handleSelectSession(session)}
                            className={cn(
                                "w-full text-left p-4 border-b hover:bg-muted/50",
                                selectedSession?.id === session.id && "bg-muted"
                            )}
                        >
                            <div className="flex justify-between items-start">
                                <p className="font-semibold truncate">Visitante</p>
                                {session.unreadBySeller && <Badge variant="destructive" className="animate-pulse">Novo</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{session.lastMessageText}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(session.lastMessageAt), { addSuffix: true, locale: ptBR })}
                            </p>
                            {session.sellerName && <Badge variant="secondary" className="mt-2">Atendido por: {session.sellerName}</Badge>}
                        </button>
                    ))}
                </ScrollArea>
            </aside>
            <main className="w-2/3 flex flex-col">
                {selectedSession ? (
                    <>
                        <CardHeader className="flex-row justify-between items-center border-b">
                             <div>
                                <CardTitle>Chat com Visitante</CardTitle>
                                <p className="text-sm text-muted-foreground">Última mensagem: {formatDistanceToNow(new Date(selectedSession.lastMessageAt), { addSuffix: true, locale: ptBR })}</p>
                             </div>
                             <Button variant="destructive" onClick={handleCloseSession}>Fechar Atendimento</Button>
                        </CardHeader>
                        <CardContent className="flex-grow p-0">
                            <ScrollArea className="h-[calc(100vh-20rem)]" ref={scrollAreaRef}>
                                <div className="p-6 space-y-4">
                                     {messages.map((msg) => (
                                        <div key={msg.id} className={cn("flex flex-col", msg.sender === 'seller' ? 'items-end' : 'items-start')}>
                                            <div className={cn("max-w-lg rounded-lg px-4 py-2", msg.sender === 'seller' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                                <p className="text-sm">{msg.text}</p>
                                            </div>
                                            <span className="text-xs text-muted-foreground mt-1">
                                                {msg.senderName} - {format(new Date(msg.timestamp), 'HH:mm')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                        <CardFooter className="p-4 border-t">
                            <form onSubmit={handleSendMessage} className="w-full flex items-center gap-2">
                                <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Digite sua resposta..."
                                    autoComplete="off"
                                />
                                <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </CardFooter>
                    </>
                ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-center text-muted-foreground">
                        <MessageSquare className="w-24 h-24 mb-4" />
                        <p className="text-lg font-semibold">Selecione um chat para começar.</p>
                        <p className="text-sm">Os chats abertos aparecerão na lista ao lado.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
