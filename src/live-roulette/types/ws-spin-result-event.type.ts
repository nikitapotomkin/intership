import { WinnerEntry } from ".";

export type WsSpinResultEvent = {
  number: number;
  color: 'red' | 'black' | 'green';
  winners: WinnerEntry[];
}