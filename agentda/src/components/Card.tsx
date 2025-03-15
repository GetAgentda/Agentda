"use client";

import React from 'react';
import styles from './Card.module.css';

type CardProps = {
  children: React.ReactNode;
  title?: string;
  variant?: 'default' | 'elevated' | 'flat';
  className?: string;
};

const Card: React.FC<CardProps> = ({
  children,
  title,
  variant = 'default',
  className = '',
}) => {
  const cardClasses = [
    styles.card,
    variant === 'elevated' ? styles.elevated : '',
    variant === 'flat' ? styles.flat : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
};

export default Card; 