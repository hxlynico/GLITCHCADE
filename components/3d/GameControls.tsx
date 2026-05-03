import { KeyboardControls, KeyboardControlsEntry } from '@react-three/drei';
import { ReactNode, useMemo } from 'react';

export enum Controls {
  forward = 'forward',
  back = 'back',
  left = 'left',
  right = 'right',
  jump = 'jump',
  sprint = 'sprint',
  weapon1 = 'weapon1',
  weapon2 = 'weapon2',
  weapon3 = 'weapon3',
  reload = 'reload'
}

export function GameControls({ children }: { children: ReactNode }) {
  const map = useMemo<KeyboardControlsEntry<Controls>[]>(() => [
    { name: Controls.forward, keys: ['ArrowUp', 'KeyW'] },
    { name: Controls.back, keys: ['ArrowDown', 'KeyS'] },
    { name: Controls.left, keys: ['ArrowLeft', 'KeyA'] },
    { name: Controls.right, keys: ['ArrowRight', 'KeyD'] },
    { name: Controls.jump, keys: ['Space'] },
    { name: Controls.sprint, keys: ['ShiftLeft', 'ShiftRight', 'Shift'] },
    { name: Controls.reload, keys: ['KeyR', 'r', 'R'] },
    { name: Controls.weapon1, keys: ['Digit1'] },
    { name: Controls.weapon2, keys: ['Digit2'] },
    { name: Controls.weapon3, keys: ['Digit3'] },
  ], []);

  return (
    <KeyboardControls map={map}>
      {children}
    </KeyboardControls>
  );
}
