/**
 * Tamil keyboard input component with transliteration support
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTamilInput } from '@/hooks/useTanglish';
import { cn } from '@/lib/utils';

export interface TamilKeyboardProps {
  onTextChange?: (text: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  value?: string;
  autoFocus?: boolean;
}

/**
 * Tamil keyboard component with transliteration and direct input support
 */
export const TamilKeyboard: React.FC<TamilKeyboardProps> = ({
  onTextChange,
  placeholder = 'Type in Tamil or English...',
  className,
  disabled = false,
  value = '',
  autoFocus = false,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    isEnabled,
    inputMethod,
    toggleTamilInput,
    switchInputMethod,
    transliterate,
  } = useTamilInput();

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const processedValue = isEnabled ? transliterate(newValue) : newValue;
    
    setInputValue(processedValue);
    onTextChange?.(processedValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Toggle Tamil input with Ctrl+Shift+T
    if (e.ctrlKey && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      toggleTamilInput();
    }
    
    // Switch input method with Ctrl+Shift+M
    if (e.ctrlKey && e.shiftKey && e.key === 'M') {
      e.preventDefault();
      switchInputMethod(inputMethod === 'transliteration' ? 'direct' : 'transliteration');
    }
  };

  const insertTamilChar = (char: string) => {
    if (!inputRef.current) return;
    
    const textarea = inputRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const newValue = inputValue.substring(0, start) + char + inputValue.substring(end);
    setInputValue(newValue);
    onTextChange?.(newValue);
    
    // Set cursor position after inserted character
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + char.length;
      textarea.focus();
    }, 0);
  };

  return (
    <div className="relative">
      {/* Input Controls */}
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={toggleTamilInput}
          className={cn(
            'px-3 py-1 text-xs rounded-md border transition-colors',
            isEnabled
              ? 'bg-primary text-white border-primary'
              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
          )}
          disabled={disabled}
        >
          {isEnabled ? 'த' : 'EN'}
        </button>
        
        {isEnabled && (
          <select
            value={inputMethod}
            onChange={(e) => switchInputMethod(e.target.value as 'transliteration' | 'direct')}
            className="px-2 py-1 text-xs border rounded-md bg-white"
            disabled={disabled}
          >
            <option value="transliteration">Transliteration</option>
            <option value="direct">Direct Input</option>
          </select>
        )}
        
        <button
          type="button"
          onClick={() => setShowKeyboard(!showKeyboard)}
          className="px-3 py-1 text-xs rounded-md border bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
          disabled={disabled}
        >
          ⌨️ Keyboard
        </button>
        
        <div className="text-xs text-gray-500">
          Ctrl+Shift+T: Toggle Tamil | Ctrl+Shift+M: Switch Mode
        </div>
      </div>

      {/* Text Input */}
      <textarea
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn(
          'w-full min-h-[100px] p-3 border rounded-md resize-vertical',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
          isEnabled ? 'font-tanglish tamil-input' : 'font-sans',
          className
        )}
      />

      {/* Virtual Tamil Keyboard */}
      {showKeyboard && (
        <TamilVirtualKeyboard
          onCharacterClick={insertTamilChar}
          onClose={() => setShowKeyboard(false)}
        />
      )}
    </div>
  );
};

/**
 * Virtual Tamil keyboard component
 */
interface TamilVirtualKeyboardProps {
  onCharacterClick: (char: string) => void;
  onClose: () => void;
}

const TamilVirtualKeyboard: React.FC<TamilVirtualKeyboardProps> = ({
  onCharacterClick,
  onClose,
}) => {
  const tamilChars = {
    vowels: ['அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'எ', 'ஏ', 'ஐ', 'ஒ', 'ஓ', 'ஔ'],
    consonants: [
      'க', 'ங', 'ச', 'ஜ', 'ஞ', 'ட', 'ண', 'த', 'ந', 'ப', 'ம',
      'ய', 'ர', 'ல', 'வ', 'ழ', 'ள', 'ற', 'ன', 'ஸ', 'ஷ', 'ஹ'
    ],
    numbers: ['௧', '௨', '௩', '௪', '௫', '௬', '௭', '௮', '௯', '௦'],
    symbols: ['்', 'ா', 'ி', 'ீ', 'ு', 'ூ', 'ெ', 'ே', 'ை', 'ொ', 'ோ', 'ௌ'],
  };

  return (
    <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white border rounded-lg shadow-lg z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">Tamil Keyboard</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      {/* Vowels */}
      <div className="mb-3">
        <div className="text-xs text-gray-600 mb-1">Vowels (உயிர்)</div>
        <div className="flex flex-wrap gap-1">
          {tamilChars.vowels.map((char) => (
            <button
              key={char}
              onClick={() => onCharacterClick(char)}
              className="px-2 py-1 text-sm border rounded hover:bg-gray-100 font-tamil"
            >
              {char}
            </button>
          ))}
        </div>
      </div>

      {/* Consonants */}
      <div className="mb-3">
        <div className="text-xs text-gray-600 mb-1">Consonants (மெய்)</div>
        <div className="flex flex-wrap gap-1">
          {tamilChars.consonants.map((char) => (
            <button
              key={char}
              onClick={() => onCharacterClick(char)}
              className="px-2 py-1 text-sm border rounded hover:bg-gray-100 font-tamil"
            >
              {char}
            </button>
          ))}
        </div>
      </div>

      {/* Symbols */}
      <div className="mb-3">
        <div className="text-xs text-gray-600 mb-1">Symbols (குறியீடுகள்)</div>
        <div className="flex flex-wrap gap-1">
          {tamilChars.symbols.map((char) => (
            <button
              key={char}
              onClick={() => onCharacterClick(char)}
              className="px-2 py-1 text-sm border rounded hover:bg-gray-100 font-tamil"
            >
              {char}
            </button>
          ))}
        </div>
      </div>

      {/* Numbers */}
      <div>
        <div className="text-xs text-gray-600 mb-1">Numbers (எண்கள்)</div>
        <div className="flex flex-wrap gap-1">
          {tamilChars.numbers.map((char) => (
            <button
              key={char}
              onClick={() => onCharacterClick(char)}
              className="px-2 py-1 text-sm border rounded hover:bg-gray-100 font-tamil"
            >
              {char}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TamilKeyboard;