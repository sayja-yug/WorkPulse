import React, { forwardRef } from 'react';

export const Table = forwardRef(({
  children,
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  return (
    <div className={`w-full overflow-x-auto overscroll-x-contain ${containerClassName}`}>
      <table
        ref={ref}
        className={`w-full caption-bottom text-xs text-left border-collapse ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
});
Table.displayName = 'Table';

export const TableHeader = forwardRef(({
  children,
  className = '',
  ...props
}, ref) => {
  return (
    <thead
      ref={ref}
      className={`border-b border-zinc-200  bg-zinc-50/70  ${className}`}
      {...props}
    >
      {children}
    </thead>
  );
});
TableHeader.displayName = 'TableHeader';

export const TableBody = forwardRef(({
  children,
  className = '',
  ...props
}, ref) => {
  return (
    <tbody
      ref={ref}
      className={`divide-y divide-zinc-100  bg-white  ${className}`}
      {...props}
    >
      {children}
    </tbody>
  );
});
TableBody.displayName = 'TableBody';

export const TableFooter = forwardRef(({
  children,
  className = '',
  ...props
}, ref) => {
  return (
    <tfoot
      ref={ref}
      className={`border-t border-zinc-200  bg-zinc-50  font-medium ${className}`}
      {...props}
    >
      {children}
    </tfoot>
  );
});
TableFooter.displayName = 'TableFooter';

export const TableRow = forwardRef(({
  children,
  className = '',
  hover = true,
  selected = false,
  ...props
}, ref) => {
  return (
    <tr
      ref={ref}
      className={`
        transition-colors
        ${hover ? 'hover:bg-zinc-50/80 ' : ''}
        ${selected ? 'bg-zinc-100/70 ' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </tr>
  );
});
TableRow.displayName = 'TableRow';

export const TableHead = forwardRef(({
  children,
  className = '',
  ...props
}, ref) => {
  return (
    <th
      ref={ref}
      scope="col"
      className={`
        py-3 px-3.5 text-[11px] font-bold text-zinc-600 
        uppercase tracking-wider whitespace-nowrap select-none ${className}
      `}
      {...props}
    >
      {children}
    </th>
  );
});
TableHead.displayName = 'TableHead';

export const TableCell = forwardRef(({
  children,
  className = '',
  ...props
}, ref) => {
  return (
    <td
      ref={ref}
      className={`py-3 px-3.5 text-zinc-800  align-middle ${className}`}
      {...props}
    >
      {children}
    </td>
  );
});
TableCell.displayName = 'TableCell';

export default Table;

