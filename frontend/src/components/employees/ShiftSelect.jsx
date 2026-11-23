import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export function ShiftSelect({ shifts, value, onChange }) {
  const id = useId();
  const trigger = useRef(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const options = [{ id: '', name: 'Unassigned' }, ...shifts];
  const selected = Math.max(0, options.findIndex((shift) => shift.id === value));
  const show = () => { setActive(selected); setOpen(true); };
  const select = (index) => { onChange(options[index].id); setOpen(false); };

  useEffect(() => {
    if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active, id]);

  function onKeyDown(event) {
    if (event.key === 'Tab') { setOpen(false); return; }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      if (open) select(active); else show();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (!open) { show(); return; }
    if (event.key === 'Home') setActive(0);
    if (event.key === 'End') setActive(options.length - 1);
    if (event.key === 'ArrowDown') setActive(Math.min(options.length - 1, active + 1));
    if (event.key === 'ArrowUp') setActive(Math.max(0, active - 1));
  }

  return (
    <div className="relative">
      <label id={`${id}-label`} htmlFor={`${id}-button`} className="mb-1 block text-[11px] font-semibold text-zinc-700">Assign Shift (optional)</label>
      <button ref={trigger} id={`${id}-button`} type="button" role="combobox" aria-labelledby={`${id}-label`}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={id}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        className="flex w-full items-center justify-between rounded-lg border border-zinc-300 bg-white px-3 py-2 text-left text-xs text-zinc-900 focus-visible:outline-2 focus-visible:outline-emerald-700"
        onClick={() => open ? setOpen(false) : show()} onKeyDown={onKeyDown} onBlur={() => setOpen(false)}>
        {options[selected].name}<ChevronDown size={14} />
      </button>
      {open && <ul id={id} role="listbox" aria-labelledby={`${id}-label`} className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-zinc-300 bg-white p-1 text-xs text-zinc-900 shadow-lg">
        {options.map((option, index) => (
          <li id={`${id}-${index}`} key={option.id} role="option" aria-selected={selected === index}
            className={`flex cursor-pointer items-center justify-between rounded px-3 py-2 ${active === index ? 'bg-emerald-100 outline-1 -outline-offset-1 outline-emerald-700' : 'bg-white'} ${selected === index ? 'font-bold' : ''}`}
            onMouseEnter={() => setActive(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => select(index)}>
            {option.name}{selected === index && <Check size={14} />}
          </li>
        ))}
      </ul>}
    </div>
  );
}
