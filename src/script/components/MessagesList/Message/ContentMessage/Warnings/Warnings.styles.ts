/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {CSSObject} from '@emotion/react';

export const warning: CSSObject = {
  color: 'var(--danger-color)',
  fontSize: 'var(--font-size-small)',
};
export const wrapper: CSSObject = {
  paddingLeft: 'var(--conversation-message-sender-width)',
  marginTop: '6px',
};
export const backendErrorLink: CSSObject = {
  fontSize: 'var(--font-size-small)',
  '&:visited:hover, &:hover': {color: 'var(--blue-500)'},
};
export const button: CSSObject = {
  marginBlock: '4px 0',
};
