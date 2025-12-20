// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { ColorModeContext } from '../../contexts/color-mode';
import config from '@util/config';

export interface LogoProps {
  collapsed?: boolean;
}

const LOGO_URL = config.logoUrl;

export const Logo: React.FC<LogoProps> = (props: LogoProps) => {
  const { collapsed = false } = props;
  const { mode } = useContext(ColorModeContext);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
        }}
        style={{
          fontSize: collapsed ? '20px' : '28px',
          fontWeight: 700,
          letterSpacing: '-0.5px',
          transition: 'font-size 0.2s ease',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: '#082544' }}>Juice</span>
        <span style={{ color: '#01BA77' }}>Hub</span>
      </motion.div>
    </div>
  );
};
