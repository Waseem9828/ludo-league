'use client';

import { Card } from './card';
import { motion } from 'framer-motion';
import Link from 'next/link';
import React from 'react';

type AnimatedCardProps = React.HTMLAttributes<HTMLDivElement> & { href?: string };

export const AnimatedCard = React.forwardRef<HTMLDivElement, AnimatedCardProps>(({ href, ...rest }, ref) => {
  const cardContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      ref={ref}
    >
      <Card {...rest} />
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{cardContent}</Link>;
  }

  return cardContent;
});

AnimatedCard.displayName = "AnimatedCard";
