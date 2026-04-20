import React, { useState } from 'react';

export default function CapsuleSelector({ 
  label, 
  placeholder = "Add an item...", 
  value = [], 
  onChange,
  presetOptions = [],
  maxItems = null,
  required = false
}) {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleAddItem = (item) => {
    if (item.trim() && !value.includes(item.trim())) {
      if (maxItems && value.length >= maxItems) {
        return;
      }
      onChange([...value, item.trim()]);
      setInputValue('');
      setShowDropdown(false);
    }
  };

  const handleRemoveItem = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      handleRemoveItem(value.length - 1);
    }
  };

  const filteredOptions = presetOptions.filter(
    option => !value.includes(option) && option.toLowerCase().includes(inputValue.toLowerCase())
  );

  const shouldShowOptions = (showDropdown || inputValue) && filteredOptions.length > 0;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-slate-200 mb-2">
          {label}
          {required && <span className="text-red-400">*</span>}
        </label>
      )}
      
      <div className="relative">
        <div className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all flex flex-wrap items-center gap-2 min-h-[44px]">
          {/* Selected Capsules */}
          {value.map((item, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-sm font-medium whitespace-nowrap"
            >
              {item}
              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                className="ml-1 hover:text-blue-200 focus:outline-none transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
          
          {/* Input Field */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowDropdown(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder={value.length === 0 ? placeholder : ""}
            maxLength={maxItems && value.length >= maxItems ? 0 : undefined}
            disabled={maxItems && value.length >= maxItems}
            className="flex-1 min-w-[120px] bg-transparent outline-none text-white placeholder-slate-500 text-sm disabled:opacity-50"
          />
        </div>

        {/* Dropdown Options */}
        {shouldShowOptions && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-[#1a2332] border border-white/10 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
            {filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleAddItem(option)}
                className="w-full text-left px-4 py-2.5 text-slate-300 hover:bg-blue-500/20 hover:text-blue-300 transition-colors border-b border-white/5 last:border-b-0 text-sm"
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>

      {maxItems && value.length >= maxItems && (
        <p className="text-xs text-slate-500 mt-1">Maximum {maxItems} items allowed</p>
      )}
    </div>
  );
}
