import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Chat {
  id: string;
  customerName: string;
  lastMessage: string;
  timestamp: string;
  status: 'active' | 'pending' | 'completed';
  unreadCount: number;
}

const getStatusColor = (status: Chat['status']) => {
  switch (status) {
    case 'active': return 'bg-green-500';
    case 'pending': return 'bg-yellow-500';
    case 'completed': return 'bg-gray-500';
    default: return 'bg-gray-500';
  }
};

export const RecentChats = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRecentChats();
    }
  }, [user]);

  const fetchRecentChats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('chats')
        .select(`
          id,
          status,
          last_message_at,
          customers (
            name,
            last_name
          ),
          messages (
            content,
            created_at,
            is_read
          )
        `)
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const transformedChats: Chat[] = (data || []).map(chat => {
        const customer = chat.customers as any;
        const messages = (chat.messages as any[]) || [];
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const unreadCount = messages.filter(msg => !msg.is_read).length;
        
        return {
          id: chat.id,
          customerName: customer ? `${customer.name} ${customer.last_name || ''}`.trim() : 'Cliente',
          lastMessage: lastMessage?.content || 'Sin mensajes aún',
          timestamp: chat.last_message_at 
            ? formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: true, locale: es })
            : 'Sin mensajes',
          status: chat.status as 'active' | 'pending' | 'completed',
          unreadCount
        };
      });

      setChats(transformedChats);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-card border-0">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-foreground">Chats Recientes</CardTitle>
            <Button variant="outline" size="sm">
              <MessageCircle className="h-4 w-4 mr-2" />
              Ver Todo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card border-0">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">Recent Chats</CardTitle>
          <Button variant="outline" size="sm">
            <MessageCircle className="h-4 w-4 mr-2" />
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {chats.length > 0 ? (
          chats.map((chat) => (
            <div key={chat.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
              <div className="relative">
                <div className="p-2 bg-primary/10 rounded-full">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusColor(chat.status)}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-foreground truncate">{chat.customerName}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {chat.timestamp}
                    </span>
                    {chat.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0.5 min-w-5 h-5">
                        {chat.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aún no hay chats. ¡Comienza a chatear con tus clientes!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};