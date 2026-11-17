import React, { createContext, useContext, useState, forwardRef } from 'react';

const TabsContext = createContext({
  activeTab: '',
  setActiveTab: () => {},
});

export const Tabs = forwardRef(({
  value,
  defaultValue = '',
  onChange,
  children,
  className = '',
  ...props
}, ref) => {
  const [internalTab, setInternalTab] = useState(defaultValue);
  const activeTab = value !== undefined ? value : internalTab;

  const handleTabChange = (newVal) => {
    if (value === undefined) setInternalTab(newVal);
    if (onChange) onChange(newVal);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <div ref={ref} className={`w-full flex flex-col gap-3 ${className}`} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
});
Tabs.displayName = 'Tabs';

export const TabsList = forwardRef(({
  children,
  className = '',
  variant = 'line', // 'line' | 'pill'
  ...props
}, ref) => {
  const variantStyles = variant === 'pill'
    ? 'p-1 bg-zinc-100 rounded-xl border border-zinc-200'
    : 'border-b border-zinc-200 gap-1';

  return (
    <div
      ref={ref}
      role="tablist"
      className={`flex items-center overflow-x-auto no-scrollbar whitespace-nowrap ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});
TabsList.displayName = 'TabsList';

export const TabsTrigger = forwardRef(({
  value,
  children,
  className = '',
  icon: Icon,
  disabled = false,
  ...props
}, ref) => {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isActive = activeTab === value;

  return (
    <button
      ref={ref}
      role="tab"
      type="button"
      disabled={disabled}
      aria-selected={isActive}
      onClick={() => setActiveTab(value)}
      className={`
        inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold transition-all outline-none cursor-pointer select-none
        disabled:opacity-40 disabled:pointer-events-none
        ${isActive
          ? 'text-zinc-950 border-b-2 border-zinc-950 font-bold'
          : 'text-zinc-500 hover:text-zinc-900 border-b-2 border-transparent'
        }
        ${className}
      `}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      <span>{children}</span>
    </button>
  );
});
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = forwardRef(({
  value,
  children,
  className = '',
  ...props
}, ref) => {
  const { activeTab } = useContext(TabsContext);
  if (activeTab !== value) return null;

  return (
    <div
      ref={ref}
      role="tabpanel"
      className={`outline-none animate-in fade-in duration-150 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});
TabsContent.displayName = 'TabsContent';

export default Tabs;
