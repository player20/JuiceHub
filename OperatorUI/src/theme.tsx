// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { ThemeConfig } from 'antd';
import { merge } from 'lodash';

const sharedTheme: ThemeConfig = {
  cssVar: true,
  token: {
    fontFamily: `'Roobert', sans-serif`,
    fontWeightStrong: 900,
    sizeStep: 4,
    sizeUnit: 4,
    fontSize: 16,
    fontSizeSM: 14,
    fontSizeLG: 18,
    fontSizeXL: 24,
    fontSizeHeading1: 48,
    fontSizeHeading2: 32,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
    /* lineHeight: '22px',
    lineHeightSM: '1',
    lineHeightLG: '1',
    lineHeightHeading1: '1',
    lineHeightHeading2: '1',
    lineHeightHeading3: '1',
    lineHeightHeading4: '1',
    lineHeightHeading5: '1',*/
  },
  components: {
    Button: {
      controlHeight: 40,
      colorPrimary: 'var(--primary-color-1)',
      colorPrimaryActive: 'var(--logo-color-1)',
      colorPrimaryHover: 'var(--logo-color-1)',
      borderRadius: 8,
      paddingInline: 18,
    },
    Select: {
      controlHeight: 40,
    },
    Input: {
      controlHeight: 40,
    },
    InputNumber: {
      controlHeight: 40,
    },
    DatePicker: {
      controlHeight: 40,
    },
    Menu: {
      itemSelectedColor: 'var(--secondary-color-2)',
      horizontalItemSelectedColor: 'var(--secondary-color-2)',
      darkItemSelectedColor: 'var(--primary-color-1)',
      itemHeight: 50,
    },
    // Switch: {
    //   // todo make custom switch for dark/light mode
    //   colorPrimary: 'rgba(165,179,255,0.75)',
    //   colorPrimaryHover: 'rgb(165,178,255)',
    //   handleSize: 40,
    //   trackHeight: 46,
    //   trackMinWidth: 92,
    // },
    Table: {
      rowHoverBg: 'var(--secondary-color-0)',
      rowExpandedBg: '#FFFFFF',
      headerBg: 'var(--secondary-color-0)',
      lineHeight: 2.5,
    },
    Tabs: {
      inkBarColor: 'var(--primary-color-1)',
      itemActiveColor: 'var(--primary-color-1)',
      itemHoverColor: 'var(--primary-color-1)',
      itemSelectedColor: 'var(--primary-color-1)',
    },
  },
};

export const lightTheme: ThemeConfig = merge({}, sharedTheme, {
  token: {
    colorBgLayout: '#ebebeb',
    colorText: 'rgba(0, 0, 0, 0.88)',
    colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
    colorTextTertiary: 'rgba(0, 0, 0, 0.45)',
  },
  components: {
    Layout: {
      siderBg: '#FFFFFF',
    },
    Menu: {
      itemColor: 'rgba(0, 0, 0, 0.88)',
      itemHoverColor: 'rgba(0, 0, 0, 0.95)',
      itemSelectedColor: '#3db014',
      itemSelectedBg: 'rgba(61, 176, 20, 0.1)',
    },
  },
});

export const darkTheme: ThemeConfig = merge({}, sharedTheme, {
  token: {
    colorBgContainer: '#1f1f1f',
    colorBgElevated: '#2a2a2a',
    colorBgLayout: '#141414',
    colorText: 'rgba(255, 255, 255, 0.88)',
    colorTextSecondary: 'rgba(255, 255, 255, 0.65)',
    colorTextTertiary: 'rgba(255, 255, 255, 0.45)',
    colorTextQuaternary: 'rgba(255, 255, 255, 0.25)',
    colorBorder: 'rgba(255, 255, 255, 0.12)',
    colorBorderSecondary: 'rgba(255, 255, 255, 0.06)',
  },
  components: {
    Layout: {
      siderBg: '#202020',
      headerBg: '#1f1f1f',
      bodyBg: '#141414',
    },
    Card: {
      colorBgContainer: '#1f1f1f',
      colorText: 'rgba(255, 255, 255, 0.88)',
      colorTextHeading: 'rgba(255, 255, 255, 0.95)',
    },
    Input: {
      colorBgContainer: '#2a2a2a',
      colorText: 'rgba(255, 255, 255, 0.88)',
      colorTextPlaceholder: 'rgba(255, 255, 255, 0.45)',
      colorBorder: 'rgba(255, 255, 255, 0.15)',
    },
    Select: {
      colorBgContainer: '#2a2a2a',
      colorText: 'rgba(255, 255, 255, 0.88)',
      colorBorder: 'rgba(255, 255, 255, 0.15)',
    },
    Table: {
      colorBgContainer: '#1f1f1f',
      colorText: 'rgba(255, 255, 255, 0.88)',
      headerBg: '#2a2a2a',
      rowHoverBg: 'rgba(255, 255, 255, 0.08)',
    },
    Typography: {
      colorText: 'rgba(255, 255, 255, 0.88)',
      colorTextHeading: 'rgba(255, 255, 255, 0.95)',
      colorTextSecondary: 'rgba(255, 255, 255, 0.65)',
    },
    Form: {
      labelColor: 'rgba(255, 255, 255, 0.88)',
    },
    Menu: {
      colorBgContainer: '#1f1f1f',
      colorText: 'rgba(255, 255, 255, 0.88)',
      itemBg: '#1f1f1f',
      itemColor: 'rgba(255, 255, 255, 0.88)',
      itemHoverBg: 'rgba(255, 255, 255, 0.08)',
      itemHoverColor: 'rgba(255, 255, 255, 0.95)',
      itemSelectedBg: 'rgba(61, 176, 20, 0.15)',
      itemSelectedColor: '#3db014',
    },
  },
});
