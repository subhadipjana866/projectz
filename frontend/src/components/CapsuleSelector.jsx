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
        <label className="field-label">
          {label}
          {required && <span className="text-rose-400">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl focus-within:border-primary-500/60 focus-within:ring-2 focus-within:ring-primary-500/25 transition-all flex flex-wrap items-center gap-2 min-h-[48px]">
          {/* Selected Capsules */}
          {value.map((item, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-500/15 text-primary-300 border border-primary-500/25 rounded-full text-sm font-medium whitespace-nowrap"
            >
              {item}
              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                className="ml-0.5 hover:text-white focus:outline-none transition-colors"
                aria-label={`Remove ${item}`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
          <div className="absolute top-full mt-2 left-0 right-0 bg-ink-800 border border-white/10 rounded-xl shadow-card z-10 max-h-48 overflow-y-auto animate-scale-in">
            {filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleAddItem(option)}
                className="w-full text-left px-4 py-2.5 text-slate-300 hover:bg-primary-500/15 hover:text-primary-300 transition-colors border-b border-white/[0.04] last:border-b-0 text-sm"
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
