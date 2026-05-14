import { createHash, randomBytes } from 'crypto';

export interface SpinResult {
  number: number;
  color: 'red' | 'black' | 'green';
}

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function generateServerSeed(): string {
  return randomBytes(32).toString('hex');
}

export function hashServerSeed(serverSeed: string): string {
  return createHash('sha256').update(serverSeed).digest('hex');
}

/**
 * Provably Fair spin
 * result = HMAC-SHA256(serverSeed, clientSeed:nonce) → число 0-36
 */
export function computeSpin(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): SpinResult {
  const { createHmac } = require('crypto');
  const message = `${clientSeed}:${nonce}`;
  const hmac = createHmac('sha256', serverSeed).update(message).digest('hex');

  // Беремо перші 8 символів hex → число 0..2^32-1
  const decimal = parseInt(hmac.slice(0, 8), 16);
  const number = decimal % 37; // 0-36

  let color: 'red' | 'black' | 'green';
  if (number === 0) color = 'green';
  else if (RED_NUMBERS.has(number)) color = 'red';
  else color = 'black';

  return { number, color };
}

/**
 * Підрахунок виплати
 * Повертає суму виплати (включаючи початкову ставку) або 0
 */
export function calculatePayout(
  betType: string,
  betValue: string,
  amount: number,
  result: SpinResult,
): number {
  const { number, color } = result;

  switch (betType) {
    case 'NUMBER':
      return parseInt(betValue) === number ? amount * 36 : 0;

    case 'COLOR':
      return betValue === color ? amount * 2 : 0;

    case 'ODD_EVEN': {
      if (number === 0) return 0;
      const isOdd = number % 2 !== 0;
      return (betValue === 'odd' && isOdd) || (betValue === 'even' && !isOdd)
        ? amount * 2
        : 0;
    }

    case 'HIGH_LOW': {
      if (number === 0) return 0;
      const isLow = number >= 1 && number <= 18;
      return (betValue === '1-18' && isLow) || (betValue === '19-36' && !isLow)
        ? amount * 2
        : 0;
    }

    case 'DOZEN': {
      const ranges: Record<string, [number, number]> = {
        '1-12': [1, 12],
        '13-24': [13, 24],
        '25-36': [25, 36],
      };
      const range = ranges[betValue];
      if (!range) return 0;
      return number >= range[0] && number <= range[1] ? amount * 3 : 0;
    }

    case 'COLUMN': {
      // Колонка 1: 1,4,7,10,13,16,19,22,25,28,31,34
      // Колонка 2: 2,5,8,11,14,17,20,23,26,29,32,35
      // Колонка 3: 3,6,9,12,15,18,21,24,27,30,33,36
      if (number === 0) return 0;
      const col = ((number - 1) % 3) + 1;
      return col === parseInt(betValue) ? amount * 3 : 0;
    }

    default:
      return 0;
  }
}