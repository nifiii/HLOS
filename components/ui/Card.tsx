import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  onClick,
}) => {
  const baseStyles = 'bg-white rounded-2xl shadow-card p-6';
  const hoverStyles = hover ? 'hover:shadow-card-hover hover:scale-[1.02] transition-all duration-300 cursor-pointer' : '';

  return (
    <div
      onClick={onClick}
      className={`${baseStyles} ${hoverStyles} ${className}`}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  icon?: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  icon,
  title,
  action,
  iconBg = 'bg-sky-100',
  iconColor = 'text-sky-500',
}) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className={`w-10 h-10 ${iconBg} rounded-full flex items-center justify-center ${iconColor}`}>
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      {action}
    </div>
  );
};
