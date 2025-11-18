
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, X, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getClientFirebase } from '@/lib/firebase-client';
import { collection, doc, setDoc, onSnapshot, addDoc, query, orderBy, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { ChatMessage, ChatSession } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const getOrCreateVisitorId = (): string => {
    if (typeof window === 'undefined') return '';
    let visitorId = localStorage.getItem('visitorId');
    if (!visitorId) {
        visitorId = `visitor-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('visitorId', visitorId);
    }
    return visitorId;
};

const notificationSound = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [visitorId] = useState(getOrCreateVisitorId);
    const [session, setSession] = useState<ChatSession | null>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const { db } = getClientFirebase();
    const previousSessionRef = useRef<ChatSession | null>(null);

    useEffect(() => {
        if (session && previousSessionRef.current) {
            // Play sound if a new unread message arrives for the visitor and the chat is closed
            if (session.unreadByVisitor && !previousSessionRef.current.unreadByVisitor && !isOpen) {
                new Audio(notificationSound).play();
            }
        }
        previousSessionRef.current = session;
    }, [session, isOpen]);

    useEffect(() => {
        if (!visitorId) return;

        const sessionRef = doc(db, 'chatSessions', visitorId);

        const unsubscribeSession = onSnapshot(sessionRef, (docSnap) => {
            if (docSnap.exists()) {
                const sessionData = docSnap.data() as ChatSession;
                setSession(sessionData);
                if (isOpen && sessionData.unreadByVisitor) {
                    updateDoc(sessionRef, { unreadByVisitor: false });
                }
            }
        });
        
        const messagesRef = collection(db, 'chatSessions', visitorId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribeMessages = onSnapshot(q, (querySnapshot) => {
            const fetchedMessages: ChatMessage[] = [];
            querySnapshot.forEach((doc) => {
                fetchedMessages.push({ id: doc.id, ...doc.data() } as ChatMessage);
            });
            setMessages(fetchedMessages);
        });

        return () => {
            unsubscribeSession();
            unsubscribeMessages();
        };
    }, [visitorId, db, isOpen]);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

    const handleToggleChat = () => {
        setIsOpen(prev => {
            const newOpenState = !prev;
            if (newOpenState && session?.unreadByVisitor) {
                const sessionRef = doc(db, 'chatSessions', visitorId);
                updateDoc(sessionRef, { unreadByVisitor: false });
            }
            return newOpenState;
        });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !visitorId) return;

        const sessionRef = doc(db, 'chatSessions', visitorId);
        const messagesRef = collection(db, 'chatSessions', visitorId, 'messages');

        const messageData: Omit<ChatMessage, 'id' | 'timestamp'> = {
            text: newMessage,
            sender: 'visitor',
            senderName: 'Visitante',
        };

        const sessionPayload: Partial<ChatSession> = {
            lastMessageAt: new Date().toISOString(),
            lastMessageText: newMessage,
            status: session?.status === 'closed' ? 'open' : session?.status || 'open',
            unreadBySeller: true,
        };

        if (!session) {
            const newSession: ChatSession = {
                id: visitorId,
                visitorId: visitorId,
                createdAt: new Date().toISOString(),
                ...sessionPayload,
                status: 'open',
                unreadBySeller: true,
                unreadByVisitor: false,
                lastMessageText: newMessage,
            };
            await setDoc(sessionRef, newSession);
        } else {
            await updateDoc(sessionRef, sessionPayload);
        }

        await addDoc(messagesRef, {
            ...messageData,
            timestamp: new Date().toISOString(),
        });

        setNewMessage('');
    };

    return (
        <>
            <div className={cn("fixed bottom-6 right-6 z-50 transition-transform duration-300", isOpen ? "translate-y-[200%]" : "translate-y-0")}>
                <Button onClick={handleToggleChat} className="rounded-full h-16 w-16 shadow-lg" aria-label="Abrir chat">
                    <MessageSquare className="h-8 w-8" />
                    {session?.unreadByVisitor && <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-destructive animate-ping"></span>}
                </Button>
            </div>
            {isOpen && (
                <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full h-full sm:w-80 sm:h-[500px] sm:rounded-lg">
                    <Card className="h-full flex flex-col shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between bg-primary text-primary-foreground p-4">
                            <CardTitle className="text-lg">Atendimento Online</CardTitle>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/80" onClick={handleToggleChat}>
                                <X className="h-5 w-5" />
                            </Button>
                        </CardHeader>
                        <CardContent className="flex-grow p-0">
                            <ScrollArea className="h-full" ref={scrollAreaRef}>
                                <div className="p-4 space-y-4">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={cn("flex flex-col", msg.sender === 'visitor' ? 'items-end' : 'items-start')}>
                                            <div className={cn("max-w-xs rounded-lg px-3 py-2", msg.sender === 'visitor' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
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
                                    placeholder="Digite sua mensagem..."
                                    autoComplete="off"
                                />
                                <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </>
    );
}
