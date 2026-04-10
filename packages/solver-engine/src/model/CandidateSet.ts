export class CandidateSet {
  private bits: number;

  constructor(bits = 0) {
    this.bits = bits;
  }

  static fromDigits(digits: number[]): CandidateSet {
    let bits = 0;
    for (const d of digits) {
      bits |= (1 << d);
    }
    return new CandidateSet(bits);
  }

  static full(size: number): CandidateSet {
    let bits = 0;
    for (let d = 1; d <= size; d++) {
      bits |= (1 << d);
    }
    return new CandidateSet(bits);
  }

  has(digit: number): boolean {
    return (this.bits & (1 << digit)) !== 0;
  }

  add(digit: number): void {
    this.bits |= (1 << digit);
  }

  remove(digit: number): void {
    this.bits &= ~(1 << digit);
  }

  count(): number {
    let n = this.bits;
    n = n - ((n >> 1) & 0x55555555);
    n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
    return (((n + (n >> 4)) & 0x0F0F0F0F) * 0x01010101) >> 24;
  }

  values(): number[] {
    const result: number[] = [];
    for (let d = 1; d <= 16; d++) {
      if (this.has(d)) result.push(d);
    }
    return result;
  }

  clone(): CandidateSet {
    return new CandidateSet(this.bits);
  }

  equals(other: CandidateSet): boolean {
    return this.bits === other.bits;
  }

  intersect(other: CandidateSet): CandidateSet {
    return new CandidateSet(this.bits & other.bits);
  }

  union(other: CandidateSet): CandidateSet {
    return new CandidateSet(this.bits | other.bits);
  }

  subtract(other: CandidateSet): CandidateSet {
    return new CandidateSet(this.bits & ~other.bits);
  }

  isEmpty(): boolean {
    return this.bits === 0;
  }

  toBits(): number {
    return this.bits;
  }
}
