
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getClientFirebase } from '@/lib/firebase-client';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import type { ChatMessage, ChatSession, ChatAttachment } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, UserCircle, CheckCircle, Circle, Paperclip, FileText, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

const notificationSound = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

export default function AtendimentoPage() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [filter, setFilter] = useState<'open' | 'active' | 'closed'>('open');
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { db } = getClientFirebase();
    const { toast } = useToast();
    const prevSessionsRef = useRef<ChatSession[]>([]);

    const originalTitleRef = useRef(typeof document !== 'undefined' ? document.title : '');
    const titleIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            audioRef.current = new Audio(notificationSound);
        }
    }, []);

    useEffect(() => {
        const hasUnread = sessions.some(session => session.unreadBySeller);
        
        if (hasUnread) {
            const lastUnreadSession = sessions.find(session => session.unreadBySeller);
            const prevSession = prevSessionsRef.current.find(p => p.id === lastUnreadSession?.id);
            
            // Play sound if a session becomes unread
            if (lastUnreadSession && (!prevSession || !prevSession.unreadBySeller)) {
                audioRef.current?.play().catch(e => console.error("Error playing sound:", e));
            }

            // Start flashing title if tab is hidden and there are unread messages
            if (document.hidden && !titleIntervalRef.current) {
                let isOriginalTitle = true;
                titleIntervalRef.current = setInterval(() => {
                    document.title = isOriginalTitle ? `(NOVO) Atendimento` : originalTitleRef.current;
                    isOriginalTitle = !isOriginalTitle;
                }, 1000);
            }
        }
        
        prevSessionsRef.current = sessions;

    }, [sessions]);


    // Effect to clear title flashing when tab is visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                if (titleIntervalRef.current) {
                    clearInterval(titleIntervalRef.current);
                    titleIntervalRef.current = null;
                    document.title = originalTitleRef.current;
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (titleIntervalRef.current) {
                clearInterval(titleIntervalRef.current);
                document.title = originalTitleRef.current;
            }
        };
    }, []);


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
                fetchedMessages.push({ sessionId: selectedSession.id, ...doc.data() } as ChatMessage);
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

    const handleSendMessage = async (text: string, attachment: ChatAttachment | null) => {
        if (!selectedSession || !user) return;
        const messageText = text || (attachment ? attachment.name : '');
        if (messageText.trim() === '') return;
    
        const messageData: Partial<ChatMessage> = {
            text: messageText,
            sender: 'seller',
            senderName: user.name,
            timestamp: new Date().toISOString(),
        };

        if (attachment) {
            messageData.attachment = attachment;
        }

        const messagesRef = collection(db, 'chatSessions', selectedSession.id, 'messages');
        await addDoc(messagesRef, messageData);
    
        const sessionRef = doc(db, 'chatSessions', selectedSession.id);
        await updateDoc(sessionRef, {
            lastMessageAt: new Date().toISOString(),
            lastMessageText: attachment ? `Anexo: ${attachment.name}` : messageText,
            unreadByVisitor: true,
        });

        setNewMessage('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    
    const processAndUploadFile = (file: File) => {
        let fileType: 'image' | 'pdf' | null = null;
        if (file.type.startsWith('image/')) {
            fileType = 'image';
        } else if (file.type === 'application/pdf') {
            fileType = 'pdf';
        } else {
            toast({ title: "Tipo de arquivo não suportado", description: "Por favor, envie apenas imagens ou arquivos PDF.", variant: "destructive" });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const url = e.target?.result as string;
            if (url) {
                const attachment: ChatAttachment = {
                    name: file.name,
                    type: fileType as 'image' | 'pdf',
                    url: url,
                };
                handleSendMessage('', attachment);
            }
        };
        reader.onerror = (error) => {
            console.error("Error processing file:", error);
            toast({ title: "Erro ao processar anexo", variant: 'destructive' });
        };
        reader.readAsDataURL(file);
    };


    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await handleSendMessage(newMessage, null);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({ title: "Arquivo muito grande", description: "O tamanho máximo do arquivo é 5MB.", variant: "destructive" });
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        processAndUploadFile(file);
    };
    
    const handleCloseSession = async () => {
        if (!selectedSession) return;
        const sessionRef = doc(db, 'chatSessions', selectedSession.id);
        await updateDoc(sessionRef, { status: 'closed' });
        setSelectedSession(null);
    }

    const filteredSessions = useMemo(() => {
        let sessionsToShow = sessions;
        if (filter === 'active') {
            sessionsToShow = sessions.filter(s => s.status === 'active');
        }
        if (filter === 'open') {
             sessionsToShow = sessions.filter(s => s.status === 'open' || s.unreadBySeller);
        }
        if (filter === 'closed') {
            sessionsToShow = sessions.filter(s => s.status === 'closed');
        }
        return sessionsToShow;
    }, [sessions, filter]);

    return (
        <div className="flex h-[calc(100vh-10rem)] border rounded-lg overflow-hidden">
            <aside className="w-1/3 border-r flex flex-col">
                <div className="p-4 border-b">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <MessageSquare /> Atendimento
                    </h2>
                     <div className="flex gap-2 mt-4">
                        <Button variant={filter === 'open' ? 'default' : 'outline'} onClick={() => setFilter('open')} size="sm">Não lidos</Button>
                        <Button variant={filter === 'active' ? 'default' : 'outline'} onClick={() => setFilter('active')} size="sm">Ativos</Button>
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
                                <p className="font-semibold truncate">{session.visitorName || 'Visitante'}</p>
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
                                <CardTitle>Chat com {selectedSession.visitorName || 'Visitante'}</CardTitle>
                                <p className="text-sm text-muted-foreground">Última mensagem: {formatDistanceToNow(new Date(selectedSession.lastMessageAt), { addSuffix: true, locale: ptBR })}</p>
                             </div>
                             <Button variant="destructive" onClick={handleCloseSession}>Fechar Atendimento</Button>
                        </CardHeader>
                        <CardContent className="flex-grow p-0">
                            <ScrollArea className="h-[calc(100vh-20rem)]" ref={scrollAreaRef}>
                                <div className="p-6 space-y-4">
                                     {messages.map((msg, index) => (
                                        <div key={`${msg.id}-${index}`} className={cn("flex flex-col", msg.sender === 'seller' ? 'items-end' : 'items-start')}>
                                            <div className={cn("max-w-lg rounded-lg px-3 py-2", msg.sender === 'seller' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                                {msg.attachment ? (
                                                    <div className="space-y-2">
                                                        {msg.attachment.type === 'image' ? (
                                                             <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="block relative w-48 h-48">
                                                                <Image src={msg.attachment.url} alt={msg.attachment.name} layout="fill" className="object-cover rounded-md" />
                                                            </a>
                                                        ) : (
                                                            <a href={msg.attachment.url} download={msg.attachment.name} className="flex items-center gap-2 p-2 rounded-md bg-background/20 hover:bg-background/40">
                                                                <FileText className="h-6 w-6" />
                                                                <span>{msg.attachment.name}</span>
                                                                <Download className="h-4 w-4 ml-auto" />
                                                            </a>
                                                        )}
                                                        {msg.text !== msg.attachment.name && <p className="text-sm">{msg.text}</p>}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm">{msg.text}</p>
                                                )}
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
                            <form onSubmit={handleFormSubmit} className="w-full flex items-center gap-2">
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileChange}
                                    accept="image/png, image/jpeg, image/gif, image/webp, application/pdf"
                                    className="hidden" 
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
                                    <Paperclip className="h-5 w-5" />
                                </Button>
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
                        <p className="text-sm">Os chats não lidos aparecerão na lista ao lado.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
