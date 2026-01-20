import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  onClick,
  disabled = false,
  className = '',
  type = 'button',
}) => {
  const baseStyles = 'font-medium rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-sky-500 text-white hover:bg-sky-600 hover:-translate-y-0.5',
    secondary: 'bg-transparent border-2 border-sky-500 text-sky-500 hover:bg-sky-50',
    success: 'bg-mint-400 text-white hover:bg-mint-500 hover:-translate-y-0.5',
    outline: 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400',
  };

  const sizes = {
    sm: 'h-8 px-4 text-sm',
    md: 'h-10 px-6 text-base',
    lg: 'h-12 px-8 text-lg',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {Icon && <Icon size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />}
      {children}
    </button>
  );
};
