import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, MessageSquare, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  content: string;
  sender_type: string;
  created_at: string;
}

interface AISuggestionsProps {
  chatId: string;
  lastCustomerMessage: Message | null;
  onSuggestionSelect: (suggestion: string) => void;
  aiAgentEnabled: boolean;
}

export function AISuggestions({ chatId, lastCustomerMessage, onSuggestionSelect, aiAgentEnabled }: AISuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Debug useEffect para ver cuando cambia el estado de suggestions
  useEffect(() => {
    console.log('AISuggestions state changed - suggestions:', suggestions, 'length:', suggestions.length);
  }, [suggestions]);

  useEffect(() => {
    console.log('AISuggestions useEffect:', { 
      lastCustomerMessage: lastCustomerMessage?.content, 
      aiAgentEnabled, 
      chatId,
      messageId: lastCustomerMessage?.id,
      senderType: lastCustomerMessage?.sender_type
    });
    
    if (lastCustomerMessage && lastCustomerMessage.sender_type === 'customer' && !aiAgentEnabled) {
      console.log('✅ Conditions met! Generating suggestions for message:', lastCustomerMessage.content);
      generateSuggestions();
    } else {
      console.log('❌ Conditions not met:', {
        hasMessage: !!lastCustomerMessage,
        isCustomer: lastCustomerMessage?.sender_type === 'customer',
        agentDisabled: !aiAgentEnabled
      });
    }
  }, [lastCustomerMessage?.id, aiAgentEnabled]);

  const generateSuggestions = async () => {
    if (!lastCustomerMessage || !chatId || aiAgentEnabled) {
      console.log('Skipping suggestions:', { lastCustomerMessage: !!lastCustomerMessage, chatId, aiAgentEnabled });
      return;
    }

    console.log('Calling edge function for suggestions...');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-chat-suggestions', {
        body: {
          chatId,
          lastMessage: lastCustomerMessage.content
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Error generating suggestions:', error);
        return;
      }

      if (data?.suggestions) {
        console.log('Received suggestions:', data.suggestions);
        console.log('About to call setSuggestions with:', data.suggestions);
        setSuggestions(data.suggestions);
        console.log('setSuggestions called');
      } else {
        console.log('No suggestions received in data:', data);
      }
    } catch (error) {
      console.error('Error calling suggestions function:', error);
    } finally {
      setLoading(false);
    }
  };

  // No mostrar si el agente IA está activado o no hay mensaje del cliente
  console.log('AISuggestions render check:', {
    hasLastCustomerMessage: !!lastCustomerMessage,
    isCustomerMessage: lastCustomerMessage?.sender_type === 'customer',
    aiAgentEnabled,
    shouldShow: lastCustomerMessage && lastCustomerMessage.sender_type === 'customer' && !aiAgentEnabled,
    suggestionsLength: suggestions.length,
    loading
  });
  
  if (!lastCustomerMessage || lastCustomerMessage.sender_type !== 'customer' || aiAgentEnabled) {
    console.log('AISuggestions: Early return - not showing suggestions');
    return null;
  }

  return (
    <Card className="mb-4 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm">Asistente IA</h3>
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              Sugerencias
            </Badge>
          </div>
        </div>

        {(() => {
          console.log('Render condition check:', {
            loading,
            suggestionsArray: suggestions,
            suggestionsLength: suggestions.length,
            shouldShowButtons: suggestions.length > 0
          });
          
          if (loading) {
            return (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                Generando sugerencias...
              </div>
            );
          }
          
          if (suggestions.length > 0) {
            return (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-2">
                  Haz clic en una sugerencia para usarla como respuesta:
                </p>
                {suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="w-full text-left justify-start h-auto py-2 px-3 whitespace-normal text-wrap"
                    onClick={() => onSuggestionSelect(suggestion)}
                  >
                    <MessageSquare className="w-3 h-3 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-xs">{suggestion}</span>
                  </Button>
                ))}
              </div>
            );
          }
          
          return null;
        })()}
      </CardContent>
    </Card>
  );
}