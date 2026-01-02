import React from 'react';

export const EmptyState = ({ icon: Icon, title, description, action, size = 'md' }) => {
  const sizeClasses = {
    sm: { icon: 'w-8 h-8', title: 'text-base', desc: 'text-sm' },
    md: { icon: 'w-12 h-12', title: 'text-lg', desc: 'text-sm' },
    lg: { icon: 'w-16 h-16', title: 'text-xl', desc: 'text-base' }
  };

  const classes = sizeClasses[size];

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="mb-4 p-4 bg-slate-100 rounded-full animate-fade-in">
        <Icon className={`${classes.icon} text-slate-400`} />
      </div>
      <h3 className={`${classes.title} font-semibold text-slate-700 mb-2`}>
        {title}
      </h3>
      <p className={`${classes.desc} text-slate-500 max-w-md mb-6`}>
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105 active:scale-95"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;

