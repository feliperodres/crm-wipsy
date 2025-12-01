import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bot, User, Clock, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface AdminChatViewProps {
  chatId: string;
  onBack: () => void;
}

export const AdminChatView = ({ chatId, onBack }: AdminChatViewProps) => {
  const { data: messages, isLoading } = useQuery({
    queryKey: ['admin-chat-messages', chatId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_chat_messages', {
        target_chat_id: chatId
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 3000, // Refresh every 3 seconds for live updates
  });

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>Vista de Conversación (Admin)</CardTitle>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className={cn(
                    "flex gap-3 mb-4",
                    i % 2 === 0 ? "justify-start" : "justify-end"
                  )}>
                    <div className="max-w-xs space-y-2">
                      <div className="h-4 bg-muted rounded w-24"></div>
                      <div className="h-16 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-16"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : messages?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay mensajes en esta conversación.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages?.map((message: any) => (
                <div
                  key={message.message_id}
                  className={cn(
                    "flex gap-3",
                    message.sender_type === 'business' || message.sender_type === 'agent'
                      ? "justify-end"
                      : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-xs lg:max-w-md rounded-lg p-3 shadow-sm",
                      message.sender_type === 'business' || message.sender_type === 'agent'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {message.sender_type === 'business' || message.sender_type === 'agent' ? (
                        <>
                          <Bot className="h-3 w-3" />
                          <span className="text-xs font-medium">
                            {message.sender_type === 'agent' ? 'IA' : 'Negocio'}
                          </span>
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3" />
                          <span className="text-xs font-medium">Cliente</span>
                        </>
                      )}
                      
                      <Badge 
                        variant="secondary" 
                        className="text-xs"
                      >
                        {message.message_type}
                      </Badge>
                    </div>

                    {/* Mostrar contenido del mensaje */}
                    {message.message_type === 'image' || (message.metadata && (message.metadata.media_url || message.metadata.imageUrl)) ? (
                      <div className="mb-2">
                        {(message.metadata?.media_url || message.metadata?.imageUrl) && (
                          <div className="mb-2">
                            <img 
                              src={message.metadata.media_url || message.metadata.imageUrl} 
                              alt="Imagen enviada"
                              className="max-w-full h-auto rounded-lg border"
                              style={{ maxHeight: '200px' }}
                              onError={(e) => {
                                console.error('Error loading image:', message.metadata?.media_url || message.metadata?.imageUrl);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        {message.content && (
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm mb-2 whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs opacity-70">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatMessageTime(message.created_at)}
                      </div>
                      
                      {message.sender_type === 'customer' && (
                        <Badge variant={message.is_read ? "default" : "destructive"} className="text-xs">
                          {message.is_read ? 'Leído' : 'No leído'}
                        </Badge>
                      )}
                    </div>

                    {message.metadata && Object.keys(message.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer opacity-70">
                          Metadata
                        </summary>
                        <pre className="text-xs mt-1 p-2 bg-black/10 rounded text-wrap overflow-hidden">
                          {JSON.stringify(message.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </ScrollArea>
    </div>
  );
};