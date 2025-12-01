import { Quote, ImageIcon } from 'lucide-react';

interface QuotedMessageProps {
  quotedMessage: {
    type: 'text' | 'image';
    content?: string;
    caption?: string;
    url?: string;
  };
}

export function QuotedMessage({ quotedMessage }: QuotedMessageProps) {
  return (
    <div className="mb-2 border-l-4 border-primary/30 bg-primary/5 rounded-r-lg p-2">
      <div className="flex items-start gap-2">
        <Quote className="h-3 w-3 text-primary/60 mt-0.5 flex-shrink-0" />
        <div className="flex-1 text-xs">
          {quotedMessage.type === 'image' ? (
            <div className="flex items-center gap-2">
              <ImageIcon className="h-3 w-3 text-primary/60" />
              <span className="text-primary/80 font-medium">Imagen</span>
              {quotedMessage.caption && (
                <span className="text-primary/70">: {quotedMessage.caption}</span>
              )}
            </div>
          ) : (
            <p className="text-primary/80 line-clamp-2">{quotedMessage.content}</p>
          )}
        </div>
      </div>
    </div>
  );
}