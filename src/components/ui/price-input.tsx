import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PriceInputProps {
  value: string | number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const PriceInput: React.FC<PriceInputProps> = ({
  value,
  onChange,
  placeholder = "0",
  className,
  disabled
}) => {
  const [displayValue, setDisplayValue] = useState('');

  // Format number with dots as thousand separators
  const formatPrice = (num: string | number) => {
    // Convert to string if it's a number
    const numStr = typeof num === 'number' ? num.toString() : num;
    // Remove all non-digit characters
    const numericValue = numStr.replace(/\D/g, '');
    
    if (numericValue === '') return '';
    
    // Add dots every 3 digits from right to left
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Remove dots to get numeric value
  const getNumericValue = (formattedValue: string) => {
    return formattedValue.replace(/\./g, '');
  };

  // Update display value when prop value changes
  useEffect(() => {
    if (value) {
      setDisplayValue(formatPrice(value));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow only digits and dots
    if (!/^[\d.]*$/.test(inputValue)) {
      return;
    }
    
    // Remove all dots to get clean numeric value
    const numericValue = getNumericValue(inputValue);
    
    // Format the display value
    const formatted = formatPrice(numericValue);
    setDisplayValue(formatted);
    
    // Send the numeric value to parent as number
    onChange(parseInt(numericValue) || 0);
  };

  const handleBlur = () => {
    // Ensure proper formatting on blur
    if (displayValue) {
      const numericValue = getNumericValue(displayValue);
      const formatted = formatPrice(numericValue);
      setDisplayValue(formatted);
    }
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
        $
      </span>
      <Input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn("pl-8", className)}
        disabled={disabled}
      />
    </div>
  );
};